/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { BoolQuery } from '@kbn/es-query';
import type {
  CardinalitySubAggregation,
  TermsSubAggregation,
} from '../../../../common/components/grouping';
import { getGroupingQuery } from '../../../../common/components/grouping';

const getGroupFields = (groupValue: string) => {
  if (groupValue === 'kibana.alert.rule.name') {
    return [groupValue, 'kibana.alert.rule.description'];
  } else {
    return [groupValue];
  }
};

interface AlertsGroupingQueryParams {
  from: string;
  to: string;
  additionalFilters: Array<{
    bool: BoolQuery;
  }>;
  selectedGroup?: string;
  runtimeMappings: MappingRuntimeFields;
  pageSize: number;
  pageIndex: number;
}

export const getAlertsGroupingQuery = ({
  from,
  to,
  additionalFilters,
  selectedGroup,
  runtimeMappings,
  pageSize,
  pageIndex,
}: AlertsGroupingQueryParams) =>
  getGroupingQuery({
    additionalFilters,
    additionalAggregationsRoot: [
      {
        alertsCount: {
          terms: {
            field: 'kibana.alert.rule.producer',
            exclude: ['alerts'],
          },
        },
      },
      ...(selectedGroup
        ? [
            {
              groupsNumber: {
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
    stackByMupltipleFields0: selectedGroup ? getGroupFields(selectedGroup) : [],
    to,
    additionalStatsAggregationsFields0: selectedGroup
      ? getAggregationsByGroupField(selectedGroup)
      : [],
    stackByMupltipleFields0Size: pageSize,
    stackByMupltipleFields0From: pageIndex * pageSize,
    additionalStatsAggregationsFields1: [],
    stackByMupltipleFields1: [],
  });

const getAggregationsByGroupField = (
  field: string
): Array<CardinalitySubAggregation | TermsSubAggregation> => {
  const aggMetrics: Array<CardinalitySubAggregation | TermsSubAggregation> = [
    {
      alertsCount: {
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
