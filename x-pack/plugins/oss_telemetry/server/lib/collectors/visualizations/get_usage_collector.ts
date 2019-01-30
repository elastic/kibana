/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { HapiServer } from '../../../../';
import { PLUGIN_ID, VIS_TELEMETRY_TASK, VIS_USAGE_TYPE } from '../../../../constants';

export function getUsageCollector(server: HapiServer) {
  const { taskManager } = server;
  return {
    type: VIS_USAGE_TYPE,
    fetch: async () => {
      let docs;
      try {
        ({ docs } = await taskManager.fetch({
          query: { bool: { filter: { term: { _id: `${PLUGIN_ID}-${VIS_TELEMETRY_TASK}` } } } },
        }));
      } catch (err) {
        const errMessage = err && err.message ? err.message : err.toString();
        /*
         * The usage service WILL to try to fetch from this collector before the task manager has been initialized, because the task manager
         * has to wait for all plugins to initialize first.
         * It's fine to ignore it as next time around it will be initialized (or it will throw a different type of error)
         */
        if (errMessage.includes('NotInitialized')) {
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
