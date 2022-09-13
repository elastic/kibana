/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { AsApiContract } from '@kbn/actions-plugin/common';
import { HttpSetup } from '@kbn/core/public';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common/constants';
import { useKibana } from '../../common/lib/kibana';
import { AlertChartData } from '../sections/rule_details/components/alert_summary';

interface UseLoadRuleAlertsAggs {
  features: string;
  ruleId: string;
}
interface RuleAlertsAggs {
  active: number;
  recovered: number;
  error?: string;
}

interface LoadRuleAlertsAggs {
  isLoadingRuleAlertsAggs: boolean;
  ruleAlertsAggs: {
    active: number;
    recovered: number;
  };
  errorRuleAlertsAggs?: string;
  alertsChartData: AlertChartData[];
}
interface IndexName {
  index: string;
}

export function useLoadRuleAlertsAggs({ features, ruleId }: UseLoadRuleAlertsAggs) {
  const { http } = useKibana().services;
  const [ruleAlertsAggs, setRuleAlertsAggs] = useState<LoadRuleAlertsAggs>({
    isLoadingRuleAlertsAggs: true,
    ruleAlertsAggs: { active: 0, recovered: 0 },
    alertsChartData: [],
  });
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());
  const loadRuleAlertsAgg = useCallback(async () => {
    isCancelledRef.current = false;
    abortCtrlRef.current.abort();
    abortCtrlRef.current = new AbortController();
    try {
      if (!features) return;
      const { index } = await fetchIndexNameAPI({
        http,
        features,
      });
      const { active, recovered, error, alertsChartData } = await fetchRuleAlertsAggByTimeRange({
        http,
        index,
        ruleId,
        signal: abortCtrlRef.current.signal,
      });
      if (error) throw error;
      if (!isCancelledRef.current) {
        setRuleAlertsAggs((oldState: LoadRuleAlertsAggs) => ({
          ...oldState,
          ruleAlertsAggs: {
            active,
            recovered,
          },
          alertsChartData,
          isLoadingRuleAlertsAggs: false,
        }));
      }
    } catch (error) {
      if (!isCancelledRef.current) {
        if (error.name !== 'AbortError') {
          setRuleAlertsAggs((oldState: LoadRuleAlertsAggs) => ({
            ...oldState,
            isLoadingRuleAlertsAggs: false,
            errorRuleAlertsAggs: error,
            alertsChartData: [],
          }));
        }
      }
    }
  }, [http, features, ruleId]);
  useEffect(() => {
    loadRuleAlertsAgg();
  }, [loadRuleAlertsAgg]);

  return ruleAlertsAggs;
}

export async function fetchIndexNameAPI({
  http,
  features,
}: {
  http: HttpSetup;
  features: string;
}): Promise<IndexName> {
  const res = await http.get<{ index_name: string[] }>(`${BASE_RAC_ALERTS_API_PATH}/index`, {
    query: { features },
  });
  return {
    index: res.index_name[0],
  };
}

interface RuleAlertsAggs {
  active: number;
  recovered: number;
  error?: string;
  alertsChartData: AlertChartData[];
}

export async function fetchRuleAlertsAggByTimeRange({
  http,
  index,
  ruleId,
  signal,
}: {
  http: HttpSetup;
  index: string;
  ruleId: string;
  signal: AbortSignal;
}): Promise<RuleAlertsAggs> {
  try {
    const res = await http.post<AsApiContract<any>>(`${BASE_RAC_ALERTS_API_PATH}/find`, {
      signal,
      body: JSON.stringify({
        index,
        size: 0,
        query: {
          bool: {
            must: [
              {
                term: {
                  'kibana.alert.rule.uuid': ruleId,
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: 'now-30d',
                    lt: 'now',
                  },
                },
              },
              {
                bool: {
                  should: [
                    {
                      term: {
                        'kibana.alert.status': 'active',
                      },
                    },
                    {
                      term: {
                        'kibana.alert.status': 'recovered',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        aggs: {
          total: {
            filters: {
              filters: {
                totalActiveAlerts: {
                  term: {
                    'kibana.alert.status': 'active',
                  },
                },
                totalRecoveredAlerts: {
                  term: {
                    'kibana.alert.status': 'recovered',
                  },
                },
              },
            },
          },
          statusPerDay: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '1d',
              extended_bounds: {
                min: 'now-30d',
                max: 'now',
              },
            },
            aggs: {
              alertStatus: {
                terms: {
                  field: 'kibana.alert.status',
                },
              },
            },
          },
        },
      }),
    });

    const active = res?.aggregations?.total.buckets.totalActiveAlerts?.doc_count ?? 0;
    const recovered = res?.aggregations?.total.buckets.totalRecoveredAlerts?.doc_count ?? 0;
    let maxTotalAlertPerDay = 0;
    res?.aggregations?.statusPerDay.buckets.forEach(
      (dayAlerts: {
        key: number;
        doc_count: number;
        alertStatus: {
          buckets: Array<{
            key: 'active' | 'recovered';
            doc_count: number;
          }>;
        };
      }) => {
        if (dayAlerts.doc_count > maxTotalAlertPerDay) {
          maxTotalAlertPerDay = dayAlerts.doc_count;
        }
      }
    );

    const alertsChartData = [
      ...res?.aggregations?.statusPerDay.buckets.reduce(
        (
          acc: AlertChartData[],
          dayAlerts: {
            key: number;
            doc_count: number;
            alertStatus: {
              buckets: Array<{
                key: 'active' | 'recovered';
                doc_count: number;
              }>;
            };
          }
        ) => {
          // We are adding this to each day to construct the 30 days bars (background bar) when there is no data for a given day or to show the delta today alerts/total alerts.
          const totalDayAlerts = {
            date: dayAlerts.key,
            count: maxTotalAlertPerDay === 0 ? 1 : maxTotalAlertPerDay,
            status: 'total',
          };

          if (dayAlerts.doc_count > 0) {
            const localAlertChartData = acc;
            // If there are alerts in this day, we construct the chart data
            dayAlerts.alertStatus.buckets.forEach((alert) => {
              localAlertChartData.push({
                date: dayAlerts.key,
                count: alert.doc_count,
                status: alert.key,
              });
            });
            const deltaAlertsCount = maxTotalAlertPerDay - dayAlerts.doc_count;
            if (deltaAlertsCount > 0) {
              localAlertChartData.push({
                date: dayAlerts.key,
                count: deltaAlertsCount,
                status: 'total',
              });
            }
            return localAlertChartData;
          }
          return [...acc, totalDayAlerts];
        },
        []
      ),
    ];
    return {
      active,
      recovered,
      alertsChartData: [
        ...alertsChartData.filter((acd) => acd.status === 'recovered'),
        ...alertsChartData.filter((acd) => acd.status === 'active'),
        ...alertsChartData.filter((acd) => acd.status === 'total'),
      ],
    };
  } catch (error) {
    return {
      error,
      active: 0,
      recovered: 0,
      alertsChartData: [],
    } as RuleAlertsAggs;
  }
}
