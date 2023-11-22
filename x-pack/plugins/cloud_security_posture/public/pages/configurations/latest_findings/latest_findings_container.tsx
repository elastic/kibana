/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { Filter } from '@kbn/es-query';
import { EuiSpacer } from '@elastic/eui';
import { defaultLoadingRenderer } from '../../../components/cloud_posture_page';
import { CloudSecurityGrouping } from '../../../components/cloud_security_grouping';
import type { FindingsBaseProps } from '../../../common/types';
import { FindingsSearchBar } from '../layout/findings_search_bar';
import { DEFAULT_TABLE_HEIGHT } from './constants';
import { useLatestFindingsGrouping } from './use_latest_findings_grouping';
import { LatestFindingsTable } from './latest_findings_table';
import { groupPanelRenderer, groupStatsRenderer } from './latest_findings_group_renderer';
import { FindingsDistributionBar } from '../layout/findings_distribution_bar';

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
  } = useLatestFindingsGrouping({ dataView, groupPanelRenderer, groupStatsRenderer });

  if (isGroupSelected) {
    return (
      <>
        <FindingsSearchBar dataView={dataView} setQuery={setUrlQuery} loading={isFetching} />
        {isGroupLoading ? (
          <div>
            <EuiSpacer size="m" />
            <FindingsDistributionBar distributionOnClick={() => {}} passed={0} failed={0} />
            {defaultLoadingRenderer()}
            {/* <CloudSecurityGrouping
              data={{
                groupByFields: {
                  buckets: [
                    {
                      key: 'test',
                      doc_count: 1,
                      failedFindings: {
                        doc_count: 1,
                      },
                    },
                  ],
                },
                groupsCount: {
                  value: 1,
                },
                unitsCount: {
                  value: 1,
                },
              }}
              grouping={grouping}
              renderChildComponent={renderChildComponent}
              onChangeGroupsItemsPerPage={onChangeGroupsItemsPerPage}
              onChangeGroupsPage={onChangeGroupsPage}
              activePageIndex={activePageIndex}
              isFetching={true}
              pageSize={pageSize}
              selectedGroup={selectedGroup}
            /> */}
          </div>
        ) : (
          <div>
            <EuiSpacer size="m" />
            <FindingsDistributionBar
              distributionOnClick={() => {}}
              passed={groupData?.passedFindings?.doc_count}
              failed={groupData?.failedFindings?.doc_count}
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
            />
          </div>
        )}
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
