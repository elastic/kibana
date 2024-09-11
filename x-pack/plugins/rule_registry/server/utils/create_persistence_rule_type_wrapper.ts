/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sortBy from 'lodash/sortBy';
import dateMath from '@elastic/datemath';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { RuleExecutorOptions } from '@kbn/alerting-plugin/server';
import { chunk, partition } from 'lodash';
import {
  ALERT_INSTANCE_ID,
  ALERT_LAST_DETECTED,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_NAMESPACE,
  ALERT_START,
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_SUPPRESSION_END,
  ALERT_SUPPRESSION_START,
  ALERT_UUID,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_WORKFLOW_STATUS,
  TIMESTAMP,
  VERSION,
  ALERT_RULE_EXECUTION_TIMESTAMP,
  ALERT_INTENDED_TIMESTAMP,
} from '@kbn/rule-data-utils';
import { mapKeys, snakeCase } from 'lodash/fp';
import type { IRuleDataClient } from '..';
import { getCommonAlertFields } from './get_common_alert_fields';
import { CreatePersistenceRuleTypeWrapper } from './persistence_types';
import { errorAggregator } from './utils';
import { AlertWithSuppressionFields870 } from '../../common/schemas/8.7.0';

/**
 * Alerts returned from BE have date type coerced to ISO strings
 *
 * We use BackendAlertWithSuppressionFields870 explicitly here as the type instead of
 * AlertWithSuppressionFieldsLatest since we're reading alerts rather than writing,
 * so future versions of Kibana may read 8.7.0 version alerts and need to update them
 */
export type BackendAlertWithSuppressionFields870<T> = Omit<
  AlertWithSuppressionFields870<T>,
  typeof ALERT_SUPPRESSION_START | typeof ALERT_SUPPRESSION_END
> & {
  [ALERT_SUPPRESSION_START]: string;
  [ALERT_SUPPRESSION_END]: string;
};

export const ALERT_GROUP_INDEX = `${ALERT_NAMESPACE}.group.index` as const;

const augmentAlerts = <T>({
  alerts,
  options,
  kibanaVersion,
  currentTimeOverride,
  intendedTimestamp,
}: {
  alerts: Array<{ _id: string; _source: T }>;
  options: RuleExecutorOptions<any, any, any, any, any>;
  kibanaVersion: string;
  currentTimeOverride: Date | undefined;
  intendedTimestamp: Date | undefined;
}) => {
  const commonRuleFields = getCommonAlertFields(options);
  return alerts.map((alert) => {
    return {
      ...alert,
      _source: {
        [ALERT_RULE_EXECUTION_TIMESTAMP]: new Date(),
        [ALERT_START]: currentTimeOverride ?? new Date(),
        [ALERT_LAST_DETECTED]: currentTimeOverride ?? new Date(),
        [ALERT_INTENDED_TIMESTAMP]: intendedTimestamp
          ? intendedTimestamp
          : currentTimeOverride ?? new Date(),
        [VERSION]: kibanaVersion,
        ...(options?.maintenanceWindowIds?.length
          ? { [ALERT_MAINTENANCE_WINDOW_IDS]: options.maintenanceWindowIds }
          : {}),
        ...commonRuleFields,
        ...alert._source,
      },
    };
  });
};

const mapAlertsToBulkCreate = <T>(alerts: Array<{ _id: string; _source: T }>) => {
  return alerts.flatMap((alert) => [{ create: { _id: alert._id } }, alert._source]);
};

/**
 * finds if any of alerts has duplicate and filter them out
 */
const filterDuplicateAlerts = async <T extends { _id: string }>({
  alerts,
  spaceId,
  ruleDataClient,
}: {
  alerts: T[];
  spaceId: string;
  ruleDataClient: IRuleDataClient;
}) => {
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
    const response = await ruleDataClient.getReader({ namespace: spaceId }).search(request);
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

  return filteredAlerts;
};

/**
 * suppress alerts by ALERT_INSTANCE_ID in memory
 */
export const suppressAlertsInMemory = <
  T extends {
    _id: string;
    _source: {
      [ALERT_SUPPRESSION_DOCS_COUNT]: number;
      [ALERT_INSTANCE_ID]: string;
      [ALERT_SUPPRESSION_START]: Date;
      [ALERT_SUPPRESSION_END]: Date;
    };
  }
>(
  alerts: T[]
): {
  alertCandidates: T[];
  suppressedAlerts: T[];
} => {
  const idsMap: Record<string, { count: number; suppressionEnd: Date }> = {};
  const suppressedAlerts: T[] = [];

  const filteredAlerts = sortBy(alerts, (alert) => alert._source[ALERT_SUPPRESSION_START]).filter(
    (alert) => {
      const instanceId = alert._source[ALERT_INSTANCE_ID];
      const suppressionDocsCount = alert._source[ALERT_SUPPRESSION_DOCS_COUNT];
      const suppressionEnd = alert._source[ALERT_SUPPRESSION_END];

      if (instanceId && idsMap[instanceId] != null) {
        idsMap[instanceId].count += suppressionDocsCount + 1;
        // store the max value of suppression end boundary
        if (suppressionEnd > idsMap[instanceId].suppressionEnd) {
          idsMap[instanceId].suppressionEnd = suppressionEnd;
        }
        suppressedAlerts.push(alert);
        return false;
      } else {
        idsMap[instanceId] = { count: suppressionDocsCount, suppressionEnd };
        return true;
      }
    },
    []
  );

  const alertCandidates = filteredAlerts.map((alert) => {
    const instanceId = alert._source[ALERT_INSTANCE_ID];
    if (instanceId) {
      alert._source[ALERT_SUPPRESSION_DOCS_COUNT] = idsMap[instanceId].count;
      alert._source[ALERT_SUPPRESSION_END] = idsMap[instanceId].suppressionEnd;
    }
    return alert;
  });

  return {
    alertCandidates,
    suppressedAlerts,
  };
};

/**
 * Compare existing alert suppression date props with alert to suppressed alert values
 **/
export const isExistingDateGtEqThanAlert = <
  T extends { [ALERT_SUPPRESSION_END]: Date; [ALERT_SUPPRESSION_START]: Date }
>(
  existingAlert: estypes.SearchHit<BackendAlertWithSuppressionFields870<{}>>,
  alert: { _id: string; _source: T },
  property: typeof ALERT_SUPPRESSION_END | typeof ALERT_SUPPRESSION_START
) => {
  const existingDate = existingAlert?._source?.[property];
  return existingDate ? existingDate >= alert._source[property].toISOString() : false;
};

interface SuppressionBoundaries {
  [ALERT_SUPPRESSION_END]: Date;
  [ALERT_SUPPRESSION_START]: Date;
}

/**
 * returns updated suppression time boundaries
 */
export const getUpdatedSuppressionBoundaries = <T extends SuppressionBoundaries>(
  existingAlert: estypes.SearchHit<BackendAlertWithSuppressionFields870<{}>>,
  alert: { _id: string; _source: T },
  executionId: string
): Partial<SuppressionBoundaries> => {
  const boundaries: Partial<SuppressionBoundaries> = {};

  if (!isExistingDateGtEqThanAlert(existingAlert, alert, ALERT_SUPPRESSION_END)) {
    boundaries[ALERT_SUPPRESSION_END] = alert._source[ALERT_SUPPRESSION_END];
  }
  // start date can only be updated for alert created in the same rule execution
  // it can happen when alert was created in first bulk created, but some of the alerts can be suppressed in the next bulk create request
  if (
    existingAlert?._source?.[ALERT_RULE_EXECUTION_UUID] === executionId &&
    isExistingDateGtEqThanAlert(existingAlert, alert, ALERT_SUPPRESSION_START)
  ) {
    boundaries[ALERT_SUPPRESSION_START] = alert._source[ALERT_SUPPRESSION_START];
  }

  return boundaries;
};

export const createPersistenceRuleTypeWrapper: CreatePersistenceRuleTypeWrapper =
  ({ logger, ruleDataClient, formatAlert }) =>
  (type) => {
    return {
      ...type,
      executor: async (options) => {
        const result = await type.executor({
          ...options,
          services: {
            ...options.services,
            alertWithPersistence: async (alerts, refresh, maxAlerts = undefined, enrichAlerts) => {
              const numAlerts = alerts.length;

              logger.debug(`Found ${numAlerts} alerts.`);

              const ruleDataClientWriter = await ruleDataClient.getWriter({
                namespace: options.spaceId,
              });

              // Only write alerts if:
              // - writing is enabled
              //   AND
              //   - rule execution has not been cancelled due to timeout
              //     OR
              //   - if execution has been cancelled due to timeout, if feature flags are configured to write alerts anyway
              const writeAlerts =
                ruleDataClient.isWriteEnabled() && options.services.shouldWriteAlerts();

              if (writeAlerts && numAlerts) {
                const filteredAlerts: typeof alerts = await filterDuplicateAlerts({
                  alerts,
                  ruleDataClient,
                  spaceId: options.spaceId,
                });

                if (filteredAlerts.length === 0) {
                  return { createdAlerts: [], errors: {}, alertsWereTruncated: false };
                } else if (maxAlerts === 0) {
                  return { createdAlerts: [], errors: {}, alertsWereTruncated: true };
                }

                let enrichedAlerts = filteredAlerts;

                if (enrichAlerts) {
                  try {
                    enrichedAlerts = await enrichAlerts(filteredAlerts, {
                      spaceId: options.spaceId,
                    });
                  } catch (e) {
                    logger.debug('Enrichments failed');
                  }
                }

                let alertsWereTruncated = false;
                if (maxAlerts && enrichedAlerts.length > maxAlerts) {
                  enrichedAlerts.length = maxAlerts;
                  alertsWereTruncated = true;
                }

                let intendedTimestamp;
                if (options.startedAtOverridden) {
                  intendedTimestamp = options.startedAt;
                }

                const augmentedAlerts = augmentAlerts({
                  alerts: enrichedAlerts,
                  options,
                  kibanaVersion: ruleDataClient.kibanaVersion,
                  currentTimeOverride: undefined,
                  intendedTimestamp,
                });

                const response = await ruleDataClientWriter.bulk({
                  body: mapAlertsToBulkCreate(augmentedAlerts),
                  refresh,
                });

                if (response == null) {
                  return { createdAlerts: [], errors: {}, alertsWereTruncated };
                }

                const createdAlerts = augmentedAlerts
                  .map((alert, idx) => {
                    const responseItem = response.body.items[idx].create;
                    return {
                      _id: responseItem?._id ?? '',
                      _index: responseItem?._index ?? '',
                      ...alert._source,
                    };
                  })
                  .filter((_, idx) => response.body.items[idx].create?.status === 201)
                  // Security solution's EQL rule consists of building block alerts which should be filtered out.
                  // Building block alerts have additional "kibana.alert.group.index" attribute which is absent for the root alert.
                  .filter((alert) => !Object.keys(alert).includes(ALERT_GROUP_INDEX));

                createdAlerts.forEach((alert) =>
                  options.services.alertFactory
                    .create(alert._id)
                    .replaceState({
                      signals_count: 1,
                    })
                    .scheduleActions(type.defaultActionGroupId, {
                      rule: mapKeys(snakeCase, {
                        ...options.params,
                        name: options.rule.name,
                        id: options.rule.id,
                      }),
                      results_link: type.getViewInAppRelativeUrl?.({
                        rule: { ...options.rule, params: options.params },
                        start: Date.parse(alert[TIMESTAMP]),
                        end: Date.parse(alert[TIMESTAMP]),
                      }),
                      alerts: [formatAlert?.(alert) ?? alert],
                    })
                );

                return {
                  createdAlerts,
                  errors: errorAggregator(response.body, [409]),
                  alertsWereTruncated,
                };
              } else {
                logger.debug('Writing is disabled.');
                return { createdAlerts: [], errors: {}, alertsWereTruncated: false };
              }
            },
            alertWithSuppression: async (
              alerts,
              suppressionWindow,
              enrichAlerts,
              currentTimeOverride,
              isRuleExecutionOnly,
              maxAlerts
            ) => {
              const ruleDataClientWriter = await ruleDataClient.getWriter({
                namespace: options.spaceId,
              });

              // Only write alerts if:
              // - writing is enabled
              //   AND
              //   - rule execution has not been cancelled due to timeout
              //     OR
              //   - if execution has been cancelled due to timeout, if feature flags are configured to write alerts anyway
              const writeAlerts =
                ruleDataClient.isWriteEnabled() && options.services.shouldWriteAlerts();

              let alertsWereTruncated = false;

              let intendedTimestamp;
              if (options.startedAtOverridden) {
                intendedTimestamp = options.startedAt;
              }

              if (writeAlerts && alerts.length > 0) {
                const suppressionWindowStart = dateMath.parse(suppressionWindow, {
                  forceNow: currentTimeOverride,
                });

                if (!suppressionWindowStart) {
                  throw new Error('Failed to parse suppression window');
                }

                const filteredDuplicates = await filterDuplicateAlerts({
                  alerts,
                  ruleDataClient,
                  spaceId: options.spaceId,
                });

                if (filteredDuplicates.length === 0) {
                  return {
                    createdAlerts: [],
                    errors: {},
                    suppressedAlerts: [],
                    alertsWereTruncated,
                  };
                }

                const suppressionAlertSearchRequest = {
                  body: {
                    size: filteredDuplicates.length,
                    query: {
                      bool: {
                        filter: [
                          {
                            range: {
                              [ALERT_START]: {
                                gte: suppressionWindowStart.toISOString(),
                              },
                            },
                          },
                          {
                            terms: {
                              [ALERT_INSTANCE_ID]: filteredDuplicates.map(
                                (alert) => alert._source[ALERT_INSTANCE_ID]
                              ),
                            },
                          },
                          {
                            bool: {
                              must_not: {
                                term: {
                                  [ALERT_WORKFLOW_STATUS]: 'closed',
                                },
                              },
                            },
                          },
                        ],
                      },
                    },
                    collapse: {
                      field: ALERT_INSTANCE_ID,
                    },
                    sort: [
                      {
                        [ALERT_START]: {
                          order: 'desc' as const,
                        },
                      },
                    ],
                  },
                };

                const response = await ruleDataClient
                  .getReader({ namespace: options.spaceId })
                  .search<
                    typeof suppressionAlertSearchRequest,
                    BackendAlertWithSuppressionFields870<{}>
                  >(suppressionAlertSearchRequest);

                const existingAlertsByInstanceId = response.hits.hits.reduce<
                  Record<string, estypes.SearchHit<BackendAlertWithSuppressionFields870<{}>>>
                >((acc, hit) => {
                  acc[hit._source[ALERT_INSTANCE_ID]] = hit;
                  return acc;
                }, {});

                // filter out alerts that were already suppressed
                // alert was suppressed if its suppression ends is older than suppression end of existing alert
                // if existing alert was created earlier during the same rule execution - then alerts can be counted as not suppressed yet
                // as they are processed for the first against this existing alert
                const nonSuppressedAlerts = filteredDuplicates.filter((alert) => {
                  const existingAlert =
                    existingAlertsByInstanceId[alert._source[ALERT_INSTANCE_ID]];

                  if (
                    !existingAlert ||
                    existingAlert?._source?.[ALERT_RULE_EXECUTION_UUID] === options.executionId
                  ) {
                    return true;
                  }

                  return !isExistingDateGtEqThanAlert(existingAlert, alert, ALERT_SUPPRESSION_END);
                });

                if (nonSuppressedAlerts.length === 0) {
                  return {
                    createdAlerts: [],
                    errors: {},
                    suppressedAlerts: [],
                    alertsWereTruncated,
                  };
                }

                const { alertCandidates, suppressedAlerts: suppressedInMemoryAlerts } =
                  suppressAlertsInMemory(nonSuppressedAlerts);

                const [duplicateAlerts, newAlerts] = partition(alertCandidates, (alert) => {
                  const existingAlert =
                    existingAlertsByInstanceId[alert._source[ALERT_INSTANCE_ID]];

                  // if suppression enabled only on rule execution, we need to suppress alerts only against
                  // alert created in the same rule execution. Otherwise, we need to create a new alert to accommodate per rule execution suppression
                  if (isRuleExecutionOnly) {
                    return (
                      existingAlert?._source?.[ALERT_RULE_EXECUTION_UUID] === options.executionId
                    );
                  } else {
                    return existingAlert != null;
                  }
                });

                const duplicateAlertUpdates = duplicateAlerts.flatMap((alert) => {
                  const existingAlert =
                    existingAlertsByInstanceId[alert._source[ALERT_INSTANCE_ID]];
                  const existingDocsCount =
                    existingAlert._source?.[ALERT_SUPPRESSION_DOCS_COUNT] ?? 0;

                  return [
                    {
                      update: {
                        _id: existingAlert._id,
                        _index: existingAlert._index,
                        require_alias: false,
                      },
                    },
                    {
                      doc: {
                        ...getUpdatedSuppressionBoundaries(
                          existingAlert,
                          alert,
                          options.executionId
                        ),
                        [ALERT_LAST_DETECTED]: currentTimeOverride ?? new Date(),
                        [ALERT_SUPPRESSION_DOCS_COUNT]:
                          existingDocsCount + alert._source[ALERT_SUPPRESSION_DOCS_COUNT] + 1,
                      },
                    },
                  ];
                });

                let enrichedAlerts = newAlerts;

                if (enrichAlerts) {
                  try {
                    enrichedAlerts = await enrichAlerts(enrichedAlerts, {
                      spaceId: options.spaceId,
                    });
                  } catch (e) {
                    logger.debug('Enrichments failed');
                  }
                }

                if (maxAlerts && enrichedAlerts.length > maxAlerts) {
                  enrichedAlerts.length = maxAlerts;
                  alertsWereTruncated = true;
                }

                const augmentedAlerts = augmentAlerts({
                  alerts: enrichedAlerts,
                  options,
                  kibanaVersion: ruleDataClient.kibanaVersion,
                  currentTimeOverride,
                  intendedTimestamp,
                });

                const bulkResponse = await ruleDataClientWriter.bulk({
                  body: [...duplicateAlertUpdates, ...mapAlertsToBulkCreate(augmentedAlerts)],
                  refresh: true,
                });

                if (bulkResponse == null) {
                  return {
                    createdAlerts: [],
                    errors: {},
                    suppressedAlerts: [],
                    alertsWereTruncated: false,
                  };
                }

                const createdAlerts = augmentedAlerts
                  .map((alert, idx) => {
                    const responseItem =
                      bulkResponse.body.items[idx + duplicateAlerts.length].create;
                    return {
                      _id: responseItem?._id ?? '',
                      _index: responseItem?._index ?? '',
                      ...alert._source,
                    };
                  })
                  .filter(
                    (_, idx) =>
                      bulkResponse.body.items[idx + duplicateAlerts.length].create?.status === 201
                  )
                  // Security solution's EQL rule consists of building block alerts which should be filtered out.
                  // Building block alerts have additional "kibana.alert.group.index" attribute which is absent for the root alert.
                  .filter((alert) => !Object.keys(alert).includes(ALERT_GROUP_INDEX));

                createdAlerts.forEach((alert) =>
                  options.services.alertFactory
                    .create(alert._id)
                    .replaceState({
                      signals_count: 1,
                    })
                    .scheduleActions(type.defaultActionGroupId, {
                      rule: mapKeys(snakeCase, {
                        ...options.params,
                        name: options.rule.name,
                        id: options.rule.id,
                      }),
                      results_link: type.getViewInAppRelativeUrl?.({
                        rule: { ...options.rule, params: options.params },
                        start: Date.parse(alert[TIMESTAMP]),
                        end: Date.parse(alert[TIMESTAMP]),
                      }),
                      alerts: [formatAlert?.(alert) ?? alert],
                    })
                );

                return {
                  createdAlerts,
                  suppressedAlerts: [...duplicateAlerts, ...suppressedInMemoryAlerts],
                  errors: errorAggregator(bulkResponse.body, [409]),
                  alertsWereTruncated,
                };
              } else {
                logger.debug('Writing is disabled.');
                return {
                  createdAlerts: [],
                  errors: {},
                  suppressedAlerts: [],
                  alertsWereTruncated: false,
                };
              }
            },
          },
        });

        return result;
      },
    };
  };
