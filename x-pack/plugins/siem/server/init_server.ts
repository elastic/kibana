/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { addMockFunctionsToSchema, IResolvers, makeExecutableSchema } from 'graphql-tools';

import { createMocks, schemas } from './graphql';
import { createAuthenticationsResolvers } from './graphql/authentications';
import { createScalarToStringArrayValueResolvers } from './graphql/ecs';
import { createEsValueResolvers, createEventsResolvers } from './graphql/events';
import { createHostsResolvers } from './graphql/hosts';
import { createIpDetailsResolvers } from './graphql/ip_details';
import { createKpiHostsResolvers } from './graphql/kpi_hosts';
import { createKpiNetworkResolvers } from './graphql/kpi_network';
import { createNetworkResolvers } from './graphql/network';
import { createOverviewResolvers } from './graphql/overview';
import { createScalarDateResolvers } from './graphql/scalar_date';
import { createScalarToBooleanArrayValueResolvers } from './graphql/scalar_to_boolean_array';
import { createScalarToDateArrayValueResolvers } from './graphql/scalar_to_date_array';
import { createScalarToNumberArrayValueResolvers } from './graphql/scalar_to_number_array';
import { createSourceStatusResolvers } from './graphql/source_status';
import { createSourcesResolvers } from './graphql/sources';
import { createUncommonProcessesResolvers } from './graphql/uncommon_processes';
import { createWhoAmIResolvers } from './graphql/who_am_i';
import { AppBackendLibs } from './lib/types';
import { Logger } from './utils/logger';

export interface Config {
  mocking: boolean;
  logger: Logger;
}

export const initServer = (libs: AppBackendLibs, config: Config) => {
  const { logger, mocking } = config;
  const schema = makeExecutableSchema({
    resolvers: [
      createAuthenticationsResolvers(libs) as IResolvers,
      createEsValueResolvers() as IResolvers,
      createEventsResolvers(libs) as IResolvers,
      createHostsResolvers(libs) as IResolvers,
      createIpDetailsResolvers(libs) as IResolvers,
      createSourcesResolvers(libs) as IResolvers,
      createScalarToStringArrayValueResolvers() as IResolvers,
      createOverviewResolvers(libs) as IResolvers,
      createNetworkResolvers(libs) as IResolvers,
      createScalarDateResolvers() as IResolvers,
      createScalarToDateArrayValueResolvers() as IResolvers,
      createScalarToBooleanArrayValueResolvers() as IResolvers,
      createScalarToNumberArrayValueResolvers() as IResolvers,
      createSourcesResolvers(libs) as IResolvers,
      createSourceStatusResolvers(libs) as IResolvers,
      createUncommonProcessesResolvers(libs) as IResolvers,
      createWhoAmIResolvers() as IResolvers,
      createKpiNetworkResolvers(libs) as IResolvers,
      createKpiHostsResolvers(libs) as IResolvers,
    ],
    typeDefs: schemas,
  });

  if (mocking) {
    const mocks = createMocks(logger);
    addMockFunctionsToSchema({ mocks, schema });
  }
  libs.framework.registerGraphQLEndpoint('/api/siem/graphql', schema);
};
