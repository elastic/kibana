/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rootSchema } from '../../common/graphql/root';
import { sharedSchema } from '../../common/graphql/shared';
import { getSourceQueryMock } from '../graphql/sources/source.mock';
import { getAllSourcesQueryMock } from '../graphql/sources/sources.mock';
import { Logger } from '../utils/logger';

import { authenticationsSchema } from './authentications';
import { ecsSchema } from './ecs';
import { eventsSchema } from './events';
import { hostsSchema } from './hosts';
import { ipDetailsSchemas } from './ip_details';
import { kpiHostsSchema } from './kpi_hosts';
import { kpiNetworkSchema } from './kpi_network';
import { networkSchema } from './network';
import { overviewSchema } from './overview';
import { dateSchema } from './scalar_date';
import { toBooleanSchema } from './scalar_to_boolean_array';
import { toDateSchema } from './scalar_to_date_array';
import { toNumberSchema } from './scalar_to_number_array';
import { sourceStatusSchema } from './source_status';
import { sourcesSchema } from './sources';
import { uncommonProcessesSchema } from './uncommon_processes';
import { whoAmISchema } from './who_am_i';
export const schemas = [
  authenticationsSchema,
  ecsSchema,
  eventsSchema,
  dateSchema,
  toNumberSchema,
  toDateSchema,
  toBooleanSchema,
  hostsSchema,
  ...ipDetailsSchemas,
  kpiNetworkSchema,
  kpiHostsSchema,
  networkSchema,
  overviewSchema,
  rootSchema,
  sourcesSchema,
  sourceStatusSchema,
  sharedSchema,
  uncommonProcessesSchema,
  whoAmISchema,
];

// The types from graphql-tools/src/mock.ts 'any' based. I add slightly
// stricter types here, but these should go away when graphql-tools using something
// other than "any" in the future for its types.
// https://github.com/apollographql/graphql-tools/blob/master/src/mock.ts#L406
export interface SiemContext {
  req: {
    payload: {
      operationName: string;
    };
  };
}

export const createMocks = (logger: Logger) => ({
  Query: () => ({
    ...getAllSourcesQueryMock(logger),
    ...getSourceQueryMock(logger),
  }),
});
