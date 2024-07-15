/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isNoneGroup, useGrouping } from '@kbn/grouping';
import * as uuid from 'uuid';
import type { DataView } from '@kbn/data-views-plugin/common';
import { GroupOption, GroupPanelRenderer, GetGroupStats } from '@kbn/grouping/src';

import { useUrlQuery } from '../../common/hooks/use_url_query';

import { FindingsBaseURLQuery } from '../../common/types';
import { useBaseEsQuery, usePersistedQuery } from '../../common/hooks/use_cloud_posture_data_table';

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_MAX_GROUPING_LEVELS = 3;

/*
 Utility hook to handle the grouping logic of the cloud security components
*/
export const useCloudSecurityGrouping = ({
  dataView,
  groupingTitle,
  defaultGroupingOptions,
  getDefaultQuery,
  unit,
  groupPanelRenderer,
  getGroupStats,
  groupingLevel,
  groupingLocalStorageKey,
  maxGroupingLevels = DEFAULT_MAX_GROUPING_LEVELS,
  groupsUnit,
}: {
  dataView: DataView;
  groupingTitle: string;
  defaultGroupingOptions: GroupOption[];
  getDefaultQuery: (params: FindingsBaseURLQuery) => FindingsBaseURLQuery;
  unit: (count: number) => string;
  groupPanelRenderer?: GroupPanelRenderer<any>;
  getGroupStats?: GetGroupStats<any>;
  groupingLevel?: number;
  groupingLocalStorageKey: string;
  maxGroupingLevels?: number;
  groupsUnit?: (n: number, parentSelectedGroup: string, hasNullGroup: boolean) => string;
}) => {
  const getPersistedDefaultQuery = usePersistedQuery(getDefaultQuery);
  const { urlQuery, setUrlQuery } = useUrlQuery(getPersistedDefaultQuery);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { query, error } = useBaseEsQuery({
    filters: urlQuery.filters,
    query: urlQuery.query,
  });

  const grouping = useGrouping({
    componentProps: {
      unit,
      groupPanelRenderer,
      getGroupStats,
      groupsUnit,
    },
    defaultGroupingOptions,
    fields: dataView.fields,
    groupingId: groupingLocalStorageKey,
    maxGroupingLevels,
    title: groupingTitle,
    onGroupChange: ({ groupByFields }) => {
      setActivePageIndex(0);
      setUrlQuery({
        groupBy: groupByFields,
      });
    },
  });

  const selectedGroup = groupingLevel
    ? grouping.selectedGroups[groupingLevel]
    : grouping.selectedGroups[0];
  /**
   * Reset the active page when the filters or query change
   * This is needed because the active page is not automatically reset when the filters or query change
   */
  useEffect(() => {
    setActivePageIndex(0);
  }, [urlQuery.filters, urlQuery.query]);

  /**
   * Set the selected groups from the URL query on the initial render
   */
  useEffect(() => {
    if (urlQuery.groupBy) {
      grouping.setSelectedGroups(urlQuery.groupBy);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // This is recommended by the grouping component to cover an edge case
  // where the selectedGroup has multiple values
  const uniqueValue = useMemo(() => `${selectedGroup}-${uuid.v4()}`, [selectedGroup]);

  const isNoneSelected = isNoneGroup(grouping.selectedGroups);

  const onChangeGroupsItemsPerPage = (size: number) => {
    setActivePageIndex(0);
    setPageSize(size);
  };

  const onResetFilters = useCallback(() => {
    setUrlQuery({
      filters: [],
      query: {
        query: '',
        language: 'kuery',
      },
    });
  }, [setUrlQuery]);

  const onChangeGroupsPage = (index: number) => setActivePageIndex(index);

  return {
    activePageIndex,
    setActivePageIndex,
    grouping,
    pageSize,
    query,
    error,
    selectedGroup,
    urlQuery,
    setUrlQuery,
    uniqueValue,
    isNoneSelected,
    onChangeGroupsItemsPerPage,
    onChangeGroupsPage,
    onResetFilters,
    filters: urlQuery.filters,
  };
};
