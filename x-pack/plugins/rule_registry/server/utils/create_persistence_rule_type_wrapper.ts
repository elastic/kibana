/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { chunk } from 'lodash';
import { ALERT_UUID, VERSION } from '@kbn/rule-data-utils';
import { getCommonAlertFields } from './get_common_alert_fields';
import { CreatePersistenceRuleTypeWrapper } from './persistence_types';

export const createPersistenceRuleTypeWrapper: CreatePersistenceRuleTypeWrapper =
  ({ logger, ruleDataClient }) =>
  (type) => {
    return {
      ...type,
      executor: async (options) => {
        const state = await type.executor({
          ...options,
          services: {
            ...options.services,
            alertWithPersistence: async (alerts, refresh) => {
              const numAlerts = alerts.length;
              logger.debug(`Found ${numAlerts} alerts.`);

              if (ruleDataClient.isWriteEnabled() && numAlerts) {
                const commonRuleFields = getCommonAlertFields(options);

                const CHUNK_SIZE = 10000;
                const alertChunks = chunk(alerts, CHUNK_SIZE);
                const filteredAlerts: typeof alerts = [];

                for (const alertChunk of alertChunks) {
                  const request: estypes.SearchRequest = {
                    body: {
                      query: {
                        ids: {
                          values: alertChunk.map((alert) => alert._id),
                        },
                      },
                      aggs: {
                        uuids: {
                          terms: {
                            field: ALERT_UUID,
                            size: CHUNK_SIZE,
                          },
                        },
                      },
                      size: 0,
                    },
                  };
                  const response = await ruleDataClient
                    .getReader({ namespace: options.spaceId })
                    .search(request);
                  const uuidsMap: Record<string, boolean> = {};
                  const aggs = response.aggregations as
                    | Record<estypes.AggregateName, { buckets: Array<{ key: string }> }>
                    | undefined;
                  if (aggs != null) {
                    aggs.uuids.buckets.forEach((bucket) => (uuidsMap[bucket.key] = true));
                    const newAlerts = alertChunk.filter((alert) => !uuidsMap[alert._id]);
                    filteredAlerts.push(...newAlerts);
                  } else {
                    filteredAlerts.push(...alertChunk);
                  }
                }

                if (filteredAlerts.length === 0) {
                  return { createdAlerts: [] };
                }

                const augmentedAlerts = filteredAlerts.map((alert) => {
                  return {
                    ...alert,
                    _source: {
                      [VERSION]: ruleDataClient.kibanaVersion,
                      ...commonRuleFields,
                      ...alert._source,
                    },
                  };
                });

                const response = await ruleDataClient
                  .getWriter({ namespace: options.spaceId })
                  .bulk({
                    body: augmentedAlerts.flatMap((alert) => [
                      { create: { _id: alert._id } },
                      alert._source,
                    ]),
                    refresh,
                  });

                if (response == null) {
                  return { createdAlerts: [] };
                }

                return {
                  createdAlerts: augmentedAlerts.map((alert, idx) => {
                    const responseItem = response.body.items[idx].create;
                    return {
                      _id: responseItem?._id ?? '',
                      _index: responseItem?._index ?? '',
                      ...alert._source,
                    };
                  }),
                };
              } else {
                logger.debug('Writing is disabled.');
                return { createdAlerts: [] };
              }
            },
          },
        });

        return state;
      },
    };
  };
