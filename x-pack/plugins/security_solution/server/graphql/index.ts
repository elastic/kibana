/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rootSchema } from '../../common/graphql/root';
import { sharedSchema } from '../../common/graphql/shared';

import { ecsSchema } from './ecs';
import { hostsSchema } from './hosts';
import { dateSchema } from './scalar_date';
import { noteSchema } from './note';
import { pinnedEventSchema } from './pinned_event';
import { toAnySchema } from './scalar_to_any';
import { toBooleanSchema } from './scalar_to_boolean_array';
import { toDateSchema } from './scalar_to_date_array';
import { toNumberSchema } from './scalar_to_number_array';
import { sourceStatusSchema } from './source_status';
import { sourcesSchema } from './sources';
import { timelineSchema } from './timeline';
export const schemas = [
  ecsSchema,
  dateSchema,
  toAnySchema,
  toNumberSchema,
  toDateSchema,
  toBooleanSchema,
  hostsSchema,
  noteSchema,
  pinnedEventSchema,
  rootSchema,
  sourcesSchema,
  sourceStatusSchema,
  sharedSchema,
  timelineSchema,
];
