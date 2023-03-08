/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { BoolQuery } from '@kbn/es-query';
import type { NamedAggregation } from '@kbn/securitysolution-grouping';
import { getGroupingQuery } from '@kbn/securitysolution-grouping';

const getGroupFields = (groupValue: string) => {
  return [groupValue];
};

interface AlertsGroupingQueryParams {
  additionalFilters: Array<{
    bool: BoolQuery;
  }>;
  from: string;
  pageIndex: number;
  pageSize: number;
  runtimeMappings: MappingRuntimeFields;
  selectedGroup: string;
  to: string;
}

export const getAlertsGroupingQuery = ({
  additionalFilters,
  from,
  pageIndex,
  pageSize,
  runtimeMappings,
  selectedGroup,
  to,
}: AlertsGroupingQueryParams) =>
  getGroupingQuery({
    additionalFilters,
    additionalAggregationsRoot: [
      {
        unitCount0: { value_count: { field: selectedGroup } },
      },
      ...(selectedGroup !== 'none'
        ? [
            {
              groupCount0: {
                cardinality: {
                  field: selectedGroup,
                },
              },
            },
          ]
        : []),
    ],
    from,
    runtimeMappings,
    stackByMultipleFields0: selectedGroup !== 'none' ? getGroupFields(selectedGroup) : [],
    to,
    additionalStatsAggregationsFields0:
      selectedGroup !== 'none' ? getAggregationsByGroupField(selectedGroup) : [],
    stackByMultipleFields0Size: pageSize,
    stackByMultipleFields0From: pageIndex * pageSize,
    additionalStatsAggregationsFields1: [],
    stackByMultipleFields1: [],
  });

const getAggregationsByGroupField = (field: string): NamedAggregation[] => {
  const aggMetrics: NamedAggregation[] = [
    {
      unitCount0: {
        cardinality: {
          field: 'kibana.alert.rule.uuid',
        },
      },
    },
  ];
  switch (field) {
    case 'kibana.alert.rule.name':
      aggMetrics.push(
        ...[
          {
            countSeveritySubAggregation: {
              cardinality: {
                field: 'kibana.alert.severity',
              },
            },
          },
          {
            severitiesSubAggregation: {
              terms: {
                field: 'kibana.alert.severity',
              },
            },
          },
          {
            usersCountAggregation: {
              cardinality: {
                field: 'kibana.alert.rule.category',
              },
            },
          },
          {
            hostsCountAggregation: {
              cardinality: {
                field: 'host.name',
              },
            },
          },
          {
            ruleTags: {
              terms: {
                field: 'kibana.alert.rule.tags',
              },
            },
          },
        ]
      );
      break;
    case 'host.name':
      aggMetrics.push(
        ...[
          {
            rulesCountAggregation: {
              cardinality: {
                field: 'kibana.alert.rule.rule_id',
              },
            },
          },
          {
            countSeveritySubAggregation: {
              cardinality: {
                field: 'kibana.alert.severity',
              },
            },
          },
          {
            severitiesSubAggregation: {
              terms: {
                field: 'kibana.alert.severity',
              },
            },
          },
          {
            usersCountAggregation: {
              cardinality: {
                field: 'kibana.alert.rule.category',
              },
            },
          },
        ]
      );
      break;
    case 'kibana.alert.rule.category':
      aggMetrics.push(
        ...[
          {
            rulesCountAggregation: {
              cardinality: {
                field: 'kibana.alert.rule.rule_id',
              },
            },
          },
          {
            countSeveritySubAggregation: {
              cardinality: {
                field: 'kibana.alert.severity',
              },
            },
          },
          {
            severitiesSubAggregation: {
              terms: {
                field: 'kibana.alert.severity',
              },
            },
          },
          {
            usersCountAggregation: {
              cardinality: {
                field: 'host.name',
              },
            },
          },
          {
            usersCountAggregation: {
              cardinality: {
                field: 'kibana.alert.rule.category',
              },
            },
          },
        ]
      );
      break;
    case 'event.action':
      aggMetrics.push(
        ...[
          {
            rulesCountAggregation: {
              cardinality: {
                field: 'kibana.alert.rule.rule_id',
              },
            },
          },
          {
            countSeveritySubAggregation: {
              cardinality: {
                field: 'kibana.alert.severity',
              },
            },
          },
          {
            severitiesSubAggregation: {
              terms: {
                field: 'kibana.alert.severity',
              },
            },
          },
          {
            usersCountAggregation: {
              cardinality: {
                field: 'host.name',
              },
            },
          },
        ]
      );
      break;
    default:
      aggMetrics.push({
        rulesCountAggregation: {
          cardinality: {
            field: 'kibana.alert.rule.rule_id',
          },
        },
      });
  }
  return aggMetrics;
};
