/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getGroupingQuery } from '@kbn/securitysolution-grouping';
import {
  GroupingAggregation,
  GroupPanelRenderer,
  GroupStatsRenderer,
  isNoneGroup,
  NamedAggregation,
  parseGroupingQuery,
} from '@kbn/securitysolution-grouping/src';
import { useMemo } from 'react';
import { LOCAL_STORAGE_VULNERABILITIES_GROUPING_KEY } from '../../../common/constants';
import { useDataViewContext } from '../../../common/contexts/data_view_context';
import {
  LATEST_VULNERABILITIES_RETENTION_POLICY,
  VULNERABILITIES_SEVERITY,
} from '../../../../common/constants';
import {
  VulnerabilitiesGroupingAggregation,
  VulnerabilitiesRootGroupingAggregation,
  useGroupedVulnerabilities,
} from './use_grouped_vulnerabilities';
import {
  defaultGroupingOptions,
  getDefaultQuery,
  GROUPING_OPTIONS,
  VULNERABILITY_FIELDS,
} from '../constants';
import { useCloudSecurityGrouping } from '../../../components/cloud_security_grouping';
import { VULNERABILITIES_UNIT, groupingTitle } from '../translations';

const getTermAggregation = (key: keyof VulnerabilitiesGroupingAggregation, field: string) => ({
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
      groupByField: {
        cardinality: {
          field,
        },
      },
      critical: {
        filter: {
          term: {
            'vulnerability.severity': { value: VULNERABILITIES_SEVERITY.CRITICAL },
          },
        },
      },
      high: {
        filter: {
          term: {
            'vulnerability.severity': { value: VULNERABILITIES_SEVERITY.HIGH },
          },
        },
      },
      medium: {
        filter: {
          term: {
            'vulnerability.severity': { value: VULNERABILITIES_SEVERITY.MEDIUM },
          },
        },
      },
      low: {
        filter: {
          term: { 'vulnerability.severity': { value: VULNERABILITIES_SEVERITY.LOW } },
        },
      },
    },
  ];

  switch (field) {
    case GROUPING_OPTIONS.RESOURCE_NAME:
      return [...aggMetrics, getTermAggregation('resourceId', VULNERABILITY_FIELDS.RESOURCE_ID)];
    case GROUPING_OPTIONS.CLOUD_ACCOUNT_NAME:
      return [
        ...aggMetrics,
        getTermAggregation('cloudProvider', VULNERABILITY_FIELDS.CLOUD_PROVIDER),
      ];
    case GROUPING_OPTIONS.CVE:
      return [...aggMetrics, getTermAggregation('description', VULNERABILITY_FIELDS.DESCRIPTION)];
  }
  return aggMetrics;
};

/**
 * Type Guard for checking if the given source is a VulnerabilitiesRootGroupingAggregation
 */
export const isVulnerabilitiesRootGroupingAggregation = (
  groupData: Record<string, any> | undefined
): groupData is VulnerabilitiesRootGroupingAggregation => {
  return groupData?.unitsCount?.value !== undefined;
};

/**
 * Utility hook to get the latest vulnerabilities grouping data
 * for the vulnerabilities page
 */
export const useLatestVulnerabilitiesGrouping = ({
  groupPanelRenderer,
  groupStatsRenderer,
}: {
  groupPanelRenderer?: GroupPanelRenderer<VulnerabilitiesGroupingAggregation>;
  groupStatsRenderer?: GroupStatsRenderer<VulnerabilitiesGroupingAggregation>;
}) => {
  const { dataView } = useDataViewContext();

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
    onResetFilters,
    error,
    filters,
  } = useCloudSecurityGrouping({
    dataView,
    groupingTitle,
    defaultGroupingOptions,
    getDefaultQuery,
    unit: VULNERABILITIES_UNIT,
    groupPanelRenderer,
    groupStatsRenderer,
    groupingLocalStorageKey: LOCAL_STORAGE_VULNERABILITIES_GROUPING_KEY,
    maxGroupingLevels: 1,
  });

  const groupingQuery = getGroupingQuery({
    additionalFilters: query ? [query] : [],
    groupByField: selectedGroup,
    uniqueValue,
    from: `now-${LATEST_VULNERABILITIES_RETENTION_POLICY}`,
    to: 'now',
    pageNumber: activePageIndex * pageSize,
    size: pageSize,
    sort: [{ groupByField: { order: 'desc' } }],
    statsAggregations: getAggregationsByGroupField(selectedGroup),
  });

  const { data, isFetching } = useGroupedVulnerabilities({
    query: groupingQuery,
    enabled: !isNoneSelected,
  });

  const groupData = useMemo(
    () =>
      parseGroupingQuery(
        selectedGroup,
        uniqueValue,
        data as GroupingAggregation<VulnerabilitiesGroupingAggregation>
      ),
    [data, selectedGroup, uniqueValue]
  );

  const isEmptyResults =
    !isFetching &&
    isVulnerabilitiesRootGroupingAggregation(groupData) &&
    groupData.unitsCount?.value === 0;

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
    onResetFilters,
    filters,
    error,
    isEmptyResults,
  };
};
