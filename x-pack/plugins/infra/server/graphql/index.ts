/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rootSchema } from '../../common/graphql/root/schema.gql';
import { sharedSchema } from '../../common/graphql/shared/schema.gql';
<<<<<<< HEAD
import { capabilitiesSchema } from './capabilities/schema.gql';
import { logEntriesSchema } from './log_entries/schema.gql';
=======
import { logEntriesSchema } from './log_entries/schema.gql';
import { metadataSchema } from './metadata/schema.gql';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import { metricsSchema } from './metrics/schema.gql';
import { nodesSchema } from './nodes/schema.gql';
import { sourceStatusSchema } from './source_status/schema.gql';
import { sourcesSchema } from './sources/schema.gql';

export const schemas = [
  rootSchema,
  sharedSchema,
<<<<<<< HEAD
  capabilitiesSchema,
=======
  metadataSchema,
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  logEntriesSchema,
  nodesSchema,
  sourcesSchema,
  sourceStatusSchema,
  metricsSchema,
];
