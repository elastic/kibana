/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CANVAS_USAGE_TYPE } from '../../common/lib/constants';
import { workpadCollector } from './workpad_collector';
import { customElementCollector } from './custom_element_collector';

const collectorFns = [workpadCollector, customElementCollector];

export function registerCanvasUsageCollector(server) {
  const collector = server.usage.collectorSet.makeUsageCollector({
    type: CANVAS_USAGE_TYPE,
    fetch: async callCluster => {
      const usage = await Promise.all(
        collectorFns.map(collector => collector(server, callCluster))
      );

      return usage.reduce(
        (reduction, usage) => {
          return { ...reduction, ...usage };
        },

        {}
      );
    },
  });

  server.usage.collectorSet.register(collector);
}
