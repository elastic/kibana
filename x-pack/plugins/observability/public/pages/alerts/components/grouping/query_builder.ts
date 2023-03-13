/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { BoolQuery } from '@kbn/es-query';
import { isNoneGroup, NamedAggregation } from '@kbn/securitysolution-grouping';
import { getGroupingQuery } from '@kbn/securitysolution-grouping';

const getGroupFields = (groupValue: string) => {
  if (groupValue === 'kibana.alert.rule.name') {
    return [groupValue, 'kibana.alert.rule.category'];
  } else {
    return [groupValue];
  }
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
    from,
    groupByFields: !isNoneGroup(selectedGroup) ? getGroupFields(selectedGroup) : [],
    metricsAggregations: !isNoneGroup(selectedGroup)
      ? getAggregationsByGroupField(selectedGroup)
      : [],
    pageNumber: pageIndex * pageSize,
    rootAggregations: [
      {
        unitsCount: { value_count: { field: selectedGroup } },
      },
      ...(!isNoneGroup(selectedGroup)
        ? [{ groupsCount: { cardinality: { field: selectedGroup } } }]
        : []),
    ],
    runtimeMappings,
    size: pageSize,
    to,
  });

const getAggregationsByGroupField = (field: string): NamedAggregation[] => {
  const aggMetrics: NamedAggregation[] = [
    {
      unitsCount: {
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
            countStatusSubAggregation: {
              cardinality: {
                field: 'kibana.alert.status',
              },
            },
          },
          {
            statusSubAggregation: {
              terms: {
                field: 'kibana.alert.status',
              },
            },
          },
          {
            agentCountAggregation: {
              cardinality: {
                field: 'agent.name',
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
            logSumAggregation: {
              sum: {
                field: 'kibana.alert.evaluation.value',
              },
            },
          },
          {
            countStatusSubAggregation: {
              cardinality: {
                field: 'kibana.alert.status',
              },
            },
          },
          {
            statusSubAggregation: {
              terms: {
                field: 'kibana.alert.status',
              },
            },
          },
          {
            hostIpCountAggregation: {
              cardinality: {
                field: 'host.ip',
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
                field: 'kibana.alert.rule.name',
              },
            },
          },
          {
            countStatusSubAggregation: {
              cardinality: {
                field: 'kibana.alert.status',
              },
            },
          },
          {
            statusSubAggregation: {
              terms: {
                field: 'kibana.alert.status',
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
            usersCountAggregation: {
              cardinality: {
                field: 'kibana.alert.rule.category',
              },
            },
          },
        ]
      );
      break;
    case 'agent.name':
      aggMetrics.push(
        ...[
          {
            rulesCountAggregation: {
              cardinality: {
                field: 'kibana.alert.rule.name',
              },
            },
          },
          {
            countStatusSubAggregation: {
              cardinality: {
                field: 'kibana.alert.status',
              },
            },
          },
          {
            statusSubAggregation: {
              terms: {
                field: 'kibana.alert.status',
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
        ]
      );
      break;
    default:
      aggMetrics.push({
        rulesCountAggregation: {
          cardinality: {
            field: 'kibana.alert.rule.name',
          },
        },
      });
  }
  return aggMetrics;
};
