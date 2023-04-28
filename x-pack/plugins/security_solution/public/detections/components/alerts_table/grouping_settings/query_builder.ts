/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { BoolQuery } from '@kbn/es-query';
import type { NamedAggregation } from '@kbn/securitysolution-grouping';
import { isNoneGroup, getGroupingQuery } from '@kbn/securitysolution-grouping';

interface AlertsGroupingQueryParams {
  additionalFilters: Array<{
    bool: BoolQuery;
  }>;
  from: string;
  pageIndex: number;
  pageSize: number;
  runtimeMappings: MappingRuntimeFields;
  selectedGroup: string;
  selectedGroupEsTypes: string[];
  to: string;
}

export const getAlertsGroupingQuery = ({
  additionalFilters,
  from,
  pageIndex,
  pageSize,
  runtimeMappings,
  selectedGroup,
  selectedGroupEsTypes,
  to,
}: AlertsGroupingQueryParams) =>
  getGroupingQuery({
    additionalFilters,
    from,
    groupByField: selectedGroup,
    statsAggregations: !isNoneGroup([selectedGroup])
      ? getAggregationsByGroupField(selectedGroup)
      : [],
    pageNumber: pageIndex * pageSize,
    rootAggregations: [
      {
        unitsCount: { value_count: { field: selectedGroup } },
      },
      ...(!isNoneGroup([selectedGroup])
        ? [{ groupsCount: { cardinality: { field: selectedGroup } } }]
        : []),
    ],
    runtimeMappings,
    selectedGroupEsTypes,
    size: pageSize,
    sort: [{ unitsCount: { order: 'desc' } }],
    to,
  });

const getAggregationsByGroupField = (field: string): NamedAggregation[] => {
  const aggMetrics: NamedAggregation[] = [
    {
      unitsCount: {
        cardinality: {
          field: 'kibana.alert.uuid',
        },
      },
    },
  ];
  switch (field) {
    case 'kibana.alert.rule.name':
      aggMetrics.push(
        ...[
          {
            description: {
              terms: {
                field: 'kibana.alert.rule.description',
                size: 1,
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
                field: 'user.name',
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
                field: 'user.name',
              },
            },
          },
        ]
      );
      break;
    case 'user.name':
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
                field: 'user.name',
              },
            },
          },
        ]
      );
      break;
    case 'source.ip':
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
