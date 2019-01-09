/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { IHapiServer } from '../../../../';
import { PLUGIN_ID, VIS_TELEMETRY_TASK, VIS_USAGE_TYPE } from '../../../../constants';

export function getUsageCollector(server: IHapiServer) {
  const { taskManager } = server;
  return {
    type: VIS_USAGE_TYPE,
    fetch: async () => {
      let docs;
      try {
        ({ docs } = await taskManager.fetch({
          bool: { filter: { term: { _id: `${PLUGIN_ID}-${VIS_TELEMETRY_TASK}` } } },
        }));
      } catch (err) {
        if (err.constructor === Error && err.toString().indexOf('Error: NotInitialized') === 0) {
          // it's fine
          docs = {};
        } else {
          throw err;
        }
      }

      // get the accumulated state from the recurring task
      return get(docs, '[0].state.stats');
    },
  };
}
