/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HostsKpiQueries } from '../../../common/search_strategy';
import { createIndicesFromPrefix } from './create_indices_from_prefix';
import { GetTransformChanges } from './types';

export const getTransformChangesForKpi: GetTransformChanges = ({ factoryQueryType, settings }) => {
  switch (factoryQueryType) {
    case HostsKpiQueries.kpiHosts: {
      return {
        indices: createIndicesFromPrefix({
          prefix: settings.prefix,
          transformIndices: ['host_ent*'],
        }),
        factoryQueryType: HostsKpiQueries.kpiHostsEntities,
      };
    }
    case HostsKpiQueries.kpiAuthentications: {
      return {
        indices: createIndicesFromPrefix({
          prefix: settings.prefix,
          transformIndices: ['user_ent*'],
        }),
        factoryQueryType: HostsKpiQueries.kpiAuthenticationsEntities,
      };
    }
    case HostsKpiQueries.kpiUniqueIps: {
      return {
        indices: createIndicesFromPrefix({
          prefix: settings.prefix,
          transformIndices: ['src_ip_ent*', 'dest_ip_ent*'],
        }),
        factoryQueryType: HostsKpiQueries.kpiUniqueIpsEntities,
      };
    }
    default: {
      return undefined;
    }
  }
};
