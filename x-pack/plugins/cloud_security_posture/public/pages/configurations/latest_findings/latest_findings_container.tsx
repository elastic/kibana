/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { Filter } from '@kbn/es-query';
import { EuiSpacer } from '@elastic/eui';
import { EmptyState } from '../../../components/empty_state';
import { CloudSecurityGrouping } from '../../../components/cloud_security_grouping';
import type { FindingsBaseProps } from '../../../common/types';
import { FindingsSearchBar } from '../layout/findings_search_bar';
import { DEFAULT_TABLE_HEIGHT } from './constants';
import { useLatestFindingsGrouping } from './use_latest_findings_grouping';
import { LatestFindingsTable } from './latest_findings_table';
import { groupPanelRenderer, groupStatsRenderer } from './latest_findings_group_renderer';
import { FindingsDistributionBar } from '../layout/findings_distribution_bar';
import { ErrorCallout } from '../layout/error_callout';

export const LatestFindingsContainer = ({ dataView }: FindingsBaseProps) => {
  const renderChildComponent = useCallback(
    (groupFilters: Filter[]) => {
      return (
        <LatestFindingsTable
          dataView={dataView}
          nonPersistedFilters={groupFilters}
          height={DEFAULT_TABLE_HEIGHT}
          showDistributionBar={false}
        />
      );
    },
    [dataView]
  );

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
    totalPassedFindings,
    onDistributionBarClick,
    totalFailedFindings,
    isEmptyResults,
  } = useLatestFindingsGrouping({ dataView, groupPanelRenderer, groupStatsRenderer });

  if (error || isEmptyResults) {
    return (
      <>
        <FindingsSearchBar dataView={dataView} setQuery={setUrlQuery} loading={isFetching} />
        <EuiSpacer size="m" />
        {error && <ErrorCallout error={error} />}
        {isEmptyResults && <EmptyState onResetFilters={onResetFilters} />}
      </>
    );
  }
  if (isGroupSelected) {
    return (
      <>
        <FindingsSearchBar dataView={dataView} setQuery={setUrlQuery} loading={isFetching} />
        <div>
          <EuiSpacer size="m" />
          <FindingsDistributionBar
            distributionOnClick={onDistributionBarClick}
            passed={totalPassedFindings}
            failed={totalFailedFindings}
          />
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
      <FindingsSearchBar dataView={dataView} setQuery={setUrlQuery} loading={isFetching} />
      <LatestFindingsTable dataView={dataView} groupSelectorComponent={grouping.groupSelector} />
    </>
  );
};
