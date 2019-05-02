/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rootSchema } from '../../common/graphql/root/schema.gql';
import { sharedSchema } from '../../common/graphql/shared/schema.gql';
import { logEntriesSchema } from './log_entries/schema.gql';
import { metadataSchema } from './metadata/schema.gql';
import { metricsSchema } from './metrics/schema.gql';
import { snapshotSchema } from './snapshot/schema.gql';
import { sourceStatusSchema } from './source_status/schema.gql';
import { sourcesSchema } from './sources/schema.gql';

export const schemas = [
  rootSchema,
  sharedSchema,
  metadataSchema,
  logEntriesSchema,
  snapshotSchema,
  sourcesSchema,
  sourceStatusSchema,
  metricsSchema,
];
