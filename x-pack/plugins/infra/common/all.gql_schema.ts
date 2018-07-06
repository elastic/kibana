/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { buildSchemaFromTypeDefinitions } from 'graphql-tools';

import { fieldsSchema } from '../server/graphql/fields';
import { nodesSchema } from '../server/graphql/nodes';
import { inputSchema } from './input';
import { rootSchema } from './root';

export const allSchemas = [inputSchema, rootSchema, nodesSchema, fieldsSchema];

// this default export is used to feed the combined types to the gql-gen tool
// which generates the corresponding typescript types
export default buildSchemaFromTypeDefinitions(allSchemas);
