/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import SwaggerParser from '@apidevtools/swagger-parser';
import Handlebars from '@kbn/handlebars';
import fs from 'fs/promises';
import { snakeCase } from 'lodash';
import type { OpenAPIV3 } from 'openapi-types';
import { resolve } from 'path';
import { ensureCleanFolder } from './ensure_clean_folder';
import { formatOutput } from './format_output';
import { registerHelpers } from './register_helpers';
import { registerTemplates } from './register_templates';

const SCHEMA_FOLDER = resolve(__dirname, '../../common/generated_schema');
const ROUTES_FOLDER = resolve(__dirname, '../../server/lib/detection_engine/generated_routes');
const API_CLIENT_FOLDER = resolve(__dirname, '../../public/common/generated_api_client');

interface AdditionalProperties {
  /**
   * Whether or not the route and its schemas should be generated
   */
  'x-codegen-enabled'?: boolean;
}

type OpenApiDocument = OpenAPIV3.Document<AdditionalProperties>;

(async () => {
  const schemaYaml = resolve(__dirname, './openapi_schema.yaml');
  const parsedSchema = (await SwaggerParser.parse(schemaYaml)) as OpenApiDocument;

  // Ensure the output directory exists and is empty
  await ensureCleanFolder(SCHEMA_FOLDER);
  await ensureCleanFolder(ROUTES_FOLDER);
  await ensureCleanFolder(API_CLIENT_FOLDER);

  // Write the parsed schema to a file for debugging
  await fs.writeFile(resolve(SCHEMA_FOLDER, './parsed_schema.json'), JSON.stringify(parsedSchema));

  // Create a handlebars instance and register helpers and partials
  const handlebars = Handlebars.create();
  registerHelpers(handlebars);
  const templates = await registerTemplates(resolve(__dirname, './templates'), handlebars);

  const apiOperations = getApiOperationsList(parsedSchema);

  // Generate common schema
  const commonSchemaResult = handlebars.compile(templates.common_schema)(parsedSchema);
  await fs.writeFile(resolve(SCHEMA_FOLDER, './common_schema.gen.ts'), commonSchemaResult);

  // Generate API client
  const apiClientResult = handlebars.compile(templates.api_client)({ apiOperations });
  await fs.writeFile(resolve(API_CLIENT_FOLDER, './api_client.gen.ts'), apiClientResult);

  await Promise.all(
    apiOperations.map(async (apiOperation) => {
      const routeName = snakeCase(apiOperation.operationId);

      // Generate request and response schemas
      const routeSchemaFolder = resolve(SCHEMA_FOLDER, `./${routeName}`);
      await ensureCleanFolder(routeSchemaFolder);
      const requestSchemaResult = handlebars.compile(templates.request_schema)(apiOperation);
      await fs.writeFile(
        resolve(routeSchemaFolder, `./${routeName}_request_schema.gen.ts`),
        removeUnusedCommonSchema(requestSchemaResult)
      );
      const responseSchemaResult = handlebars.compile(templates.response_schema)(apiOperation);
      await fs.writeFile(
        resolve(routeSchemaFolder, `./${routeName}_response_schema.gen.ts`),
        removeUnusedCommonSchema(responseSchemaResult)
      );

      // Generate API routes
      const routeFolder = resolve(ROUTES_FOLDER, `./${routeName}`);
      await ensureCleanFolder(routeFolder);
      const apiRouteResult = handlebars.compile(templates.api_route)(apiOperation);
      await fs.writeFile(resolve(routeFolder, `./${routeName}_route.gen.ts`), apiRouteResult);

      // Generate implementations for new routes
      const implPath = resolve(routeFolder, `./${routeName}_implementation.ts`);
      try {
        await fs.access(implPath);
      } catch (err) {
        // Generate the implementation file only if it doesn't exist; we don't
        // want to overwrite existing files
        if (err.code === 'ENOENT') {
          const apiImplementationResult = handlebars.compile(templates.api_route_implementation)(
            apiOperation
          );
          await fs.writeFile(implPath, apiImplementationResult);
        } else {
          throw err;
        }
      }
    })
  );

  // Format the output folder using prettier as the generator produces unformatted code
  await formatOutput(SCHEMA_FOLDER);
  await formatOutput(ROUTES_FOLDER);
  await formatOutput(API_CLIENT_FOLDER);
})();

function removeUnusedCommonSchema(input: string) {
  if (!input.includes('CommonSchema.')) {
    return input.replace(/import \* as CommonSchema from [^;]+;/, '');
  }
  return input;
}

function getApiOperationsList(parsedSchema: OpenApiDocument) {
  return Object.entries(parsedSchema.paths).flatMap(([path, pathDescription]) => {
    return (['get', 'post', 'put', 'delete'] as const).flatMap((method) => {
      const operation = pathDescription?.[method];
      if (operation && operation['x-codegen-enabled'] !== false) {
        // Convert the query parameters to a schema object
        const params: Record<
          'query' | 'path',
          Required<Pick<OpenAPIV3.NonArraySchemaObject, 'properties' | 'type' | 'required'>>
        > = {
          query: {
            type: 'object',
            properties: {},
            required: [],
          },
          path: {
            type: 'object',
            properties: {},
            required: [],
          },
        };

        operation.parameters?.forEach((parameter) => {
          if ('name' in parameter && (parameter.in === 'query' || parameter.in === 'path')) {
            params[parameter.in].properties[parameter.name] = {
              ...parameter.schema,
              description: parameter.description,
            };

            if (parameter.required) {
              params[parameter.in].required.push(parameter.name);
            }
          }
        });

        if ('$ref' in operation.responses?.['200']) {
          throw new Error(
            `Cannot generate API client for ${method} ${path}: $ref in response is not supported`
          );
        }
        const response = operation.responses?.['200']?.content?.['application/json']?.schema;

        if (operation.requestBody && '$ref' in operation.requestBody) {
          throw new Error(
            `Cannot generate API client for ${method} ${path}: $ref in request body is not supported`
          );
        }
        const requestBody = operation.requestBody?.content?.['application/json']?.schema;

        const { operationId, description, tags, deprecated } = operation;
        if (!operationId) {
          throw new Error(`Missing operationId for ${method} ${path}`);
        }

        return {
          path,
          method,
          requestParams: Object.keys(params.path.properties).length ? params.path : undefined,
          requestQuery: Object.keys(params.query.properties).length ? params.query : undefined,
          requestBody,
          response,
          operationId,
          description,
          tags,
          deprecated,
        };
      } else {
        return [];
      }
    });
  });
}
