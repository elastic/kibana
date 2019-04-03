/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';

export interface UiMetricRecord {
  metricType: string;
  count: number;
}

export interface UiMetricAndCountKeyValuePair {
  key: string;
  value: number;
}

// This is a helper method for retrieving user interaction telemetry data stored via the OSS
// ui_metric API.
export function fetchUiMetrics(
  server: Server,
  appName: string,
  metricTypes: string[]
): Promise<UiMetricAndCountKeyValuePair[]> {
  const { SavedObjectsClient, getSavedObjectsRepository } = server.savedObjects;
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
  const internalRepository = getSavedObjectsRepository(callWithInternalUser);
  const savedObjectsClient = new SavedObjectsClient(internalRepository);

  async function fetchUiMetric(metricType: string): Promise<UiMetricRecord | undefined> {
    try {
      const savedObjectId = `${appName}:${metricType}`;
      const savedObject = await savedObjectsClient.get('ui-metric', savedObjectId);
      return { metricType, count: savedObject.attributes.count };
    } catch (error) {
      return undefined;
    }
  }

  return Promise.all(metricTypes.map(fetchUiMetric)).then(
    (userActions): UiMetricAndCountKeyValuePair[] => {
      const userActionAndCountKeyValuePairs = userActions.reduce(
        (pairs: UiMetricAndCountKeyValuePair[], uiMetric: UiMetricRecord | undefined) => {
          // UI metric is undefined if nobody has performed this interaction on the client yet.
          if (uiMetric !== undefined) {
            const { metricType, count } = uiMetric;
            const pair: UiMetricAndCountKeyValuePair = { key: metricType, value: count };
            pairs.push(pair);
          }
          return pairs;
        },
        []
      );

      return userActionAndCountKeyValuePairs;
    }
  );
}
