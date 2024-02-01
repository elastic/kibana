/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Filter } from '@kbn/es-query';
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useLatestVulnerabilitiesGrouping } from './hooks/use_latest_vulnerabilities_grouping';
import { LatestVulnerabilitiesTable } from './latest_vulnerabilities_table';
import { groupPanelRenderer, groupStatsRenderer } from './latest_vulnerabilities_group_renderer';
import { FindingsSearchBar } from '../configurations/layout/findings_search_bar';
import { ErrorCallout } from '../configurations/layout/error_callout';
import { EmptyState } from '../../components/empty_state';
import { CloudSecurityGrouping } from '../../components/cloud_security_grouping';
import { DEFAULT_GROUPING_TABLE_HEIGHT } from '../../common/constants';

export const LatestVulnerabilitiesContainer = () => {
  const renderChildComponent = (groupFilters: Filter[]) => {
    return (
      <LatestVulnerabilitiesTable
        nonPersistedFilters={groupFilters}
        height={DEFAULT_GROUPING_TABLE_HEIGHT}
      />
    );
  };

  const {
    isGroupSelected,
    groupData,
    grouping,
    isFetching,
    activePageIndex,
    pageSize,
    selectedGroup,
    onChangeGroupsItemsPerPage,
    onChangeGroupsPage,
    setUrlQuery,
    isGroupLoading,
    onResetFilters,
    error,
    isEmptyResults,
  } = useLatestVulnerabilitiesGrouping({ groupPanelRenderer, groupStatsRenderer });

  if (error || isEmptyResults) {
    return (
      <>
        <FindingsSearchBar setQuery={setUrlQuery} loading={isFetching} />
        <EuiSpacer size="m" />
        {error && <ErrorCallout error={error} />}
        {isEmptyResults && <EmptyState onResetFilters={onResetFilters} />}
      </>
    );
  }
  if (isGroupSelected) {
    return (
      <>
        <FindingsSearchBar setQuery={setUrlQuery} loading={isFetching} />
        <div>
          <EuiSpacer size="m" />
          <CloudSecurityGrouping
            data={groupData}
            grouping={grouping}
            renderChildComponent={renderChildComponent}
            onChangeGroupsItemsPerPage={onChangeGroupsItemsPerPage}
            onChangeGroupsPage={onChangeGroupsPage}
            activePageIndex={activePageIndex}
            isFetching={isFetching}
            pageSize={pageSize}
            selectedGroup={selectedGroup}
            isGroupLoading={isGroupLoading}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <FindingsSearchBar setQuery={setUrlQuery} loading={isFetching} />
      <EuiSpacer size="m" />
      <LatestVulnerabilitiesTable groupSelectorComponent={grouping.groupSelector} />
    </>
  );
};
