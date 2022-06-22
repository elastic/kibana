/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CollectorFetchContext, UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { TelemetryCollector } from '../../types';

import { workpadCollector, workpadSchema, WorkpadTelemetry } from './workpad_collector';
import {
  customElementCollector,
  CustomElementTelemetry,
  customElementSchema,
} from './custom_element_collector';

type CanvasUsage = WorkpadTelemetry & CustomElementTelemetry;

const collectors: TelemetryCollector[] = [workpadCollector, customElementCollector];

/*
  Register the canvas usage collector function

  This will call all of the defined collectors and combine the individual results into a single object
  to be returned to the caller.

  A usage collector function returns an object derived from current data in the ES Cluster.
*/
export function registerCanvasUsageCollector(
  usageCollection: UsageCollectionSetup | undefined,
  kibanaIndex: string
) {
  if (!usageCollection) {
    return;
  }

  const canvasCollector = usageCollection.makeUsageCollector<CanvasUsage>({
    type: 'canvas',
    isReady: () => true,
    fetch: async ({ esClient }: CollectorFetchContext) => {
      const collectorResults = await Promise.all(
        collectors.map((collector) => collector(kibanaIndex, esClient))
      );

      return collectorResults.reduce((reduction, usage) => {
        return { ...reduction, ...usage };
      }, {}) as CanvasUsage; // We need the casting because `TelemetryCollector` claims it returns `Record<string, any>`
    },
    schema: { ...workpadSchema, ...customElementSchema },
  });

  usageCollection.registerCollector(canvasCollector);
}
