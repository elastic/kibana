/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getGroupingQuery } from '@kbn/securitysolution-grouping';
import {
  GroupPanelRenderer,
  GroupStatsRenderer,
  isNoneGroup,
  NamedAggregation,
  parseGroupingQuery,
} from '@kbn/securitysolution-grouping/src';
import { useMemo } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { LATEST_FINDINGS_RETENTION_POLICY } from '../../../../common/constants';
import { FindingsGroupingAggregation, useGroupedFindings } from './use_grouped_findings';
import {
  FINDINGS_UNIT,
  groupingTitle,
  defaultGroupingOptions,
  getDefaultQuery,
  GROUPING_OPTIONS,
} from './constants';
import { useCloudSecurityGrouping } from '../../../components/cloud_security_grouping';

const getTermAggregation = (key: keyof FindingsGroupingAggregation, field: string) => ({
  [key]: {
    terms: { field, size: 1 },
  },
});

const getAggregationsByGroupField = (field: string): NamedAggregation[] => {
  if (isNoneGroup([field])) {
    return [];
  }
  const aggMetrics: NamedAggregation[] = [
    {
      failedFindings: {
        filter: {
          term: {
            'result.evaluation': { value: 'failed' },
          },
        },
      },
    },
  ];

  switch (field) {
    case GROUPING_OPTIONS.RESOURCE:
      return [
        ...aggMetrics,
        getTermAggregation('resourceName', 'resource.id'),
        getTermAggregation('resourceSubType', 'resource.sub_type'),
        getTermAggregation('resourceType', 'resource.type'),
      ];

    case GROUPING_OPTIONS.RULE:
      return [
        ...aggMetrics,
        getTermAggregation('benchmarkName', 'rule.benchmark.name'),
        getTermAggregation('benchmarkVersion', 'rule.benchmark.version'),
      ];
    case GROUPING_OPTIONS.CLOUD_ACCOUNT:
      return [
        ...aggMetrics,
        getTermAggregation('benchmarkName', 'rule.benchmark.name'),
        getTermAggregation('benchmarkId', 'rule.benchmark.id'),
      ];
    case GROUPING_OPTIONS.KUBERNETES:
      return [
        ...aggMetrics,
        getTermAggregation('benchmarkName', 'rule.benchmark.name'),
        getTermAggregation('benchmarkId', 'rule.benchmark.id'),
      ];
    case 'resource.type':
      return [
        ...aggMetrics,
        getTermAggregation('resourceName', 'resource.id'),
        getTermAggregation('resourceType', 'resource.type'),
      ];
    case 'resource.sub_type':
      return [
        ...aggMetrics,
        getTermAggregation('resourceName', 'resource.id'),
        getTermAggregation('resourceType', 'resource.type'),
        getTermAggregation('resourceSubType', 'resource.sub_type'),
      ];
  }
  return aggMetrics;
};

/**
 * Utility hook to get the latest findings grouping data
 * for the findings page
 */
export const useLatestFindingsGrouping = ({
  dataView,
  groupPanelRenderer,
  groupStatsRenderer,
}: {
  dataView: DataView;
  groupPanelRenderer?: GroupPanelRenderer<FindingsGroupingAggregation>;
  groupStatsRenderer?: GroupStatsRenderer<FindingsGroupingAggregation>;
}) => {
  const {
    activePageIndex,
    grouping,
    pageSize,
    query,
    selectedGroup,
    onChangeGroupsItemsPerPage,
    onChangeGroupsPage,
    setUrlQuery,
    uniqueValue,
    isNoneSelected,
  } = useCloudSecurityGrouping({
    dataView,
    groupingTitle,
    defaultGroupingOptions,
    getDefaultQuery,
    unit: FINDINGS_UNIT,
    groupPanelRenderer,
    groupStatsRenderer,
  });

  const groupingQuery = getGroupingQuery({
    additionalFilters: [
      query,
      // {
      //   bool: {
      //     must: [],
      //     must_not: [],
      //     should: [],
      //     filter: [{ exists: { field: selectedGroup } }],
      //   },
      // },
    ],
    groupByField: selectedGroup,
    uniqueValue,
    from: `now-${LATEST_FINDINGS_RETENTION_POLICY}`,
    to: 'now',
    pageNumber: activePageIndex * pageSize,
    size: pageSize,
    sort: [{ _count: { order: 'desc' } }, { _key: { order: 'asc' } }],
    statsAggregations: getAggregationsByGroupField(selectedGroup),
    rootAggregations: [
      {
        failedFindings: {
          filter: {
            term: {
              'result.evaluation': { value: 'failed' },
            },
          },
        },
        passedFindings: {
          filter: {
            term: {
              'result.evaluation': { value: 'passed' },
            },
          },
        },
      },
    ],
  });

  const { data, isFetching } = useGroupedFindings({
    query: groupingQuery,
    enabled: !isNoneSelected,
  });

  const groupData = useMemo(
    () => parseGroupingQuery(selectedGroup, uniqueValue, data),
    [data, selectedGroup, uniqueValue]
  );

  return {
    groupData,
    grouping,
    isFetching,
    activePageIndex,
    pageSize,
    selectedGroup,
    onChangeGroupsItemsPerPage,
    onChangeGroupsPage,
    setUrlQuery,
    isGroupSelected: !isNoneSelected,
    isGroupLoading: !data,
  };
};
