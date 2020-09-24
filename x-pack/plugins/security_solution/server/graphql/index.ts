/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rootSchema } from '../../common/graphql/root';
import { sharedSchema } from '../../common/graphql/shared';

import { authenticationsSchema } from './authentications';
import { ecsSchema } from './ecs';
import { eventsSchema } from './events';
import { hostsSchema } from './hosts';
import { kpiHostsSchema } from './kpi_hosts';
import { kpiNetworkSchema } from './kpi_network';
import { networkSchema } from './network';
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
import { whoAmISchema } from './who_am_i';
import { matrixHistogramSchema } from './matrix_histogram';
export const schemas = [
  authenticationsSchema,
  ecsSchema,
  eventsSchema,
  dateSchema,
  toAnySchema,
  toNumberSchema,
  toDateSchema,
  toBooleanSchema,
  hostsSchema,
  kpiNetworkSchema,
  kpiHostsSchema,
  matrixHistogramSchema,
  networkSchema,
  noteSchema,
  pinnedEventSchema,
  rootSchema,
  sourcesSchema,
  sourceStatusSchema,
  sharedSchema,
  timelineSchema,
  whoAmISchema,
];
