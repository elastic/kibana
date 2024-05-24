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
import { buildEsQuery, Filter } from '@kbn/es-query';
import {
  LOCAL_STORAGE_VULNERABILITIES_GROUPING_KEY,
  VULNERABILITY_GROUPING_OPTIONS,
  VULNERABILITY_FIELDS,
} from '../../../common/constants';
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
import { defaultGroupingOptions, getDefaultQuery } from '../constants';
import { useCloudSecurityGrouping } from '../../../components/cloud_security_grouping';
import { VULNERABILITIES_UNIT, groupingTitle, VULNERABILITIES_GROUPS_UNIT } from '../translations';

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
    case VULNERABILITY_GROUPING_OPTIONS.RESOURCE_NAME:
      return [...aggMetrics, getTermAggregation('resourceId', VULNERABILITY_FIELDS.RESOURCE_ID)];
    case VULNERABILITY_GROUPING_OPTIONS.CLOUD_ACCOUNT_NAME:
      return [
        ...aggMetrics,
        getTermAggregation('cloudProvider', VULNERABILITY_FIELDS.CLOUD_PROVIDER),
      ];
    case VULNERABILITY_GROUPING_OPTIONS.CVE:
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
  groupingLevel = 0,
  groupFilters = [],
  selectedGroup,
}: {
  groupPanelRenderer?: GroupPanelRenderer<VulnerabilitiesGroupingAggregation>;
  groupStatsRenderer?: GroupStatsRenderer<VulnerabilitiesGroupingAggregation>;
  groupingLevel?: number;
  groupFilters?: Filter[];
  selectedGroup?: string;
}) => {
  const { dataView } = useDataViewContext();

  const {
    activePageIndex,
    grouping,
    pageSize,
    query,
    onChangeGroupsItemsPerPage,
    onChangeGroupsPage,
    setUrlQuery,
    uniqueValue,
    isNoneSelected,
    onResetFilters,
    error,
    filters,
    setActivePageIndex,
  } = useCloudSecurityGrouping({
    dataView,
    groupingTitle,
    defaultGroupingOptions,
    getDefaultQuery,
    unit: VULNERABILITIES_UNIT,
    groupPanelRenderer,
    groupStatsRenderer,
    groupingLocalStorageKey: LOCAL_STORAGE_VULNERABILITIES_GROUPING_KEY,
    groupingLevel,
    groupsUnit: VULNERABILITIES_GROUPS_UNIT,
  });

  const additionalFilters = buildEsQuery(dataView, [], groupFilters);
  const currentSelectedGroup = selectedGroup || grouping.selectedGroups[0];

  const groupingQuery = getGroupingQuery({
    additionalFilters: query ? [query, additionalFilters] : [additionalFilters],
    groupByField: currentSelectedGroup,
    uniqueValue,
    from: `now-${LATEST_VULNERABILITIES_RETENTION_POLICY}`,
    to: 'now',
    pageNumber: activePageIndex * pageSize,
    size: pageSize,
    sort: [{ groupByField: { order: 'desc' } }],
    statsAggregations: getAggregationsByGroupField(currentSelectedGroup),
  });

  const { data, isFetching } = useGroupedVulnerabilities({
    query: groupingQuery,
    enabled: !isNoneSelected,
  });

  const groupData = useMemo(
    () =>
      parseGroupingQuery(
        currentSelectedGroup,
        uniqueValue,
        data as GroupingAggregation<VulnerabilitiesGroupingAggregation>
      ),
    [data, currentSelectedGroup, uniqueValue]
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
    setActivePageIndex,
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
