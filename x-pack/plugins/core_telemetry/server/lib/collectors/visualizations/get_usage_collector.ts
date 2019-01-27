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
        if (errMessage.indexOf('NotInitialized') >= 0) {
          // it's possible for the usage service to try to fetch from this collector before the task manager has been
          // initialized.  if we catch this particular case, it's fine to ignore it: next time around it will be
          // initialized (or throw a different type of error)
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
