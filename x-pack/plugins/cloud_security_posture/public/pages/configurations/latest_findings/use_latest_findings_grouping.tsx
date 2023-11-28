/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getGroupingQuery } from '@kbn/securitysolution-grouping';
import { parseGroupingQuery } from '@kbn/securitysolution-grouping/src';
import { useMemo } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { LATEST_FINDINGS_RETENTION_POLICY } from '../../../../common/constants';
import { useGroupedFindings } from './use_grouped_findings';
import { FINDINGS_UNIT, groupingTitle, defaultGroupingOptions, getDefaultQuery } from './constants';
import { useCloudSecurityGrouping } from '../../../components/cloud_security_grouping';

/**
 * Utility hook to get the latest findings grouping data
 * for the findings page
 */
export const useLatestFindingsGrouping = ({ dataView }: { dataView: DataView }) => {
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
  });

  const groupingQuery = getGroupingQuery({
    additionalFilters: [query],
    groupByField: selectedGroup,
    uniqueValue,
    from: `now-${LATEST_FINDINGS_RETENTION_POLICY}`,
    to: 'now',
    pageNumber: activePageIndex * pageSize,
    size: pageSize,
    sort: [{ _key: { order: 'asc' } }],
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
    isGroupSelect: !isNoneSelected,
    isGroupLoading: !data,
  };
};
