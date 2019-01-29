/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

import { Server } from 'hapi';

import { INDEX_META_DATA_CREATED_BY } from '../../../common/constants/file_datavisualizer';
import { callWithInternalUserFactory } from '../../client/call_with_internal_user_factory';

// import { Dictionary } from '../../../common/types/common';
import { createMlTelemetry, MlTelemetry } from './ml_telemetry';

// TODO these types should be defined by the platform
interface KibanaHapiServer extends Server {
  usage: {
    collectorSet: {
      makeUsageCollector: any;
      register: any;
    };
  };
}

// type CallCuster = (arg: string) => Promise<Dictionary<object>>;

export function makeMlUsageCollector(server: KibanaHapiServer): void {
  const callWithInternalUser = callWithInternalUserFactory(server);

  const mlUsageCollector = server.usage.collectorSet.makeUsageCollector({
    type: 'ml',
    fetch: async (): Promise<MlTelemetry> => {
      try {
        // Fetch all index mappings
        const allMappings = await callWithInternalUser('indices.getMapping');

        // Iterate over the mappings and count the number of indices which have
        // INDEX_META_DATA_CREATED_BY as their _meta.created_by field.
        const indicesCount = Object.keys(allMappings).reduce((count, mappingKey) => {
          const createdBy = get(allMappings[mappingKey], 'mappings._meta.created_by');
          return createdBy === INDEX_META_DATA_CREATED_BY ? count + 1 : count;
        }, 0);

        return createMlTelemetry(indicesCount);
      } catch (err) {
        return createMlTelemetry();
      }
    },
  });
  server.usage.collectorSet.register(mlUsageCollector);
}
