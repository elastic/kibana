/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rootSchema } from '../../common/graphql/root/schema.gql';
import { fieldsSchema } from './fields/schema.gql';
import { logEntriesSchema } from './log_entries/schema.gql';
import { nodesSchema } from './nodes/schema.gql';
import { sourcesSchema } from './sources/schema.gql';

export const schemas = [rootSchema, fieldsSchema, logEntriesSchema, nodesSchema, sourcesSchema];
