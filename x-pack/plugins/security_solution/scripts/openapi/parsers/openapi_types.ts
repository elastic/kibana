/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OpenAPIV3 } from 'openapi-types';

interface AdditionalProperties {
  /**
   * Whether or not the route and its schemas should be generated
   */
  'x-codegen-enabled'?: boolean;
}

export type OpenApiDocument = OpenAPIV3.Document<AdditionalProperties>;

// Override the OpenAPI types to add the x-codegen-enabled property to the
// components object.
declare module 'openapi-types' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace OpenAPIV3 {
    interface ComponentsObject {
      'x-codegen-enabled'?: boolean;
    }
  }
}

/**
 * OpenAPI types do not have a dedicated type for objects, so we need to create
 * to use for path and query parameters
 */
export interface ObjectSchema {
  type: 'object';
  required: string[];
  description?: string;
  properties: {
    [name: string]: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject;
  };
}

/**
 * The normalized operation object that is used in the templates
 */
export interface NormalizedOperation {
  path: string;
  method: OpenAPIV3.HttpMethods;
  operationId: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  requestParams?: ObjectSchema;
  requestQuery?: ObjectSchema;
  requestBody?: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject;
  response?: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject;
}
