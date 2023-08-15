/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import SwaggerParser from '@apidevtools/swagger-parser';
import chalk from 'chalk';
import fs from 'fs/promises';
import globby from 'globby';
import { resolve } from 'path';
import { fixEslint } from './lib/fix_eslint';
import { formatOutput } from './lib/format_output';
import { removeGenArtifacts } from './lib/remove_gen_artifacts';
import { getApiOperationsList } from './parsers/get_api_operations_list';
import { getComponents } from './parsers/get_components';
import { getImportsMap } from './parsers/get_imports_map';
import type { OpenApiDocument } from './parsers/openapi_types';
import { initTemplateService } from './template_service/template_service';

const ROOT_SECURITY_SOLUTION_FOLDER = resolve(__dirname, '../..');
const COMMON_API_FOLDER = resolve(ROOT_SECURITY_SOLUTION_FOLDER, './common/api');
const SCHEMA_FILES_GLOB = resolve(ROOT_SECURITY_SOLUTION_FOLDER, './**/*.schema.yaml');
const GENERATED_ARTIFACTS_GLOB = resolve(COMMON_API_FOLDER, './**/*.gen.ts');

export const generate = async () => {
  console.log(chalk.bold(`Generating API route schemas`));
  console.log(chalk.bold(`Working directory: ${chalk.underline(COMMON_API_FOLDER)}`));

  console.log(`👀  Searching for schemas`);
  const schemaPaths = await globby([SCHEMA_FILES_GLOB]);

  console.log(`🕵️‍♀️   Found ${schemaPaths.length} schemas, parsing`);
  const parsedSchemas = await Promise.all(
    schemaPaths.map(async (schemaPath) => {
      const parsedSchema = (await SwaggerParser.parse(schemaPath)) as OpenApiDocument;
      return { schemaPath, parsedSchema };
    })
  );

  console.log(`🧹  Cleaning up any previously generated artifacts`);
  await removeGenArtifacts(COMMON_API_FOLDER);

  console.log(`🪄   Generating new artifacts`);
  const TemplateService = await initTemplateService();
  await Promise.all(
    parsedSchemas.map(async ({ schemaPath, parsedSchema }) => {
      const components = getComponents(parsedSchema);
      const apiOperations = getApiOperationsList(parsedSchema);
      const importsMap = getImportsMap(parsedSchema);

      // If there are no operations or components to generate, skip this file
      const shouldGenerate = apiOperations.length > 0 || components !== undefined;
      if (!shouldGenerate) {
        return;
      }

      const result = TemplateService.compileTemplate('schemas', {
        components,
        apiOperations,
        importsMap,
      });

      // Write the generation result to disk
      await fs.writeFile(schemaPath.replace('.schema.yaml', '.gen.ts'), result);
    })
  );

  // Format the output folder using prettier as the generator produces
  // unformatted code and fix any eslint errors
  console.log(`💅  Formatting output`);
  await formatOutput(GENERATED_ARTIFACTS_GLOB);
  await fixEslint(GENERATED_ARTIFACTS_GLOB);
};
