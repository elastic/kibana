/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Filter } from '@kbn/es-query';
import { EuiSpacer } from '@elastic/eui';
import { useGrouping } from '@kbn/securitysolution-grouping';
import { ParsedGroupingAggregation } from '@kbn/securitysolution-grouping/src';
import { useLatestFindingsDataView } from '../../../common/api/use_latest_findings_data_view';
import { LATEST_FINDINGS_INDEX_PATTERN } from '../../../../common/constants';
import { EmptyState } from '../../../components/empty_state';
import { CloudSecurityGrouping } from '../../../components/cloud_security_grouping';
import { FindingsSearchBar } from '../layout/findings_search_bar';
import { DEFAULT_TABLE_HEIGHT } from './constants';
import { useLatestFindingsGrouping } from './use_latest_findings_grouping';
import { LatestFindingsTable } from './latest_findings_table';
import { groupPanelRenderer, groupStatsRenderer } from './latest_findings_group_renderer';
import { ErrorCallout } from '../layout/error_callout';
import { CSP_GROUPING_LOADING } from '../../../components/test_subjects';

interface CloudSecurityGroupingProps {
  data: ParsedGroupingAggregation<any>;
  renderChildComponent: (groupFilter: Filter[]) => JSX.Element;
  grouping: ReturnType<typeof useGrouping>;
  activePageIndex: number;
  isFetching: boolean;
  pageSize: number;
  onChangeGroupsItemsPerPage: (size: number) => void;
  onChangeGroupsPage: (index: number) => void;
  selectedGroup: string;
  isGroupLoading?: boolean;
}

const SubGrouping = ({
  renderChildComponent,
  groupingLevel,
  parentGroupFilters,
  selectedGroup,
  groupSelectorComponent,
}: {
  renderChildComponent: (groupFilters: Filter[]) => JSX.Element;
  groupingLevel: number;
  parentGroupFilters?: string;
  selectedGroup: string;
  groupSelectorComponent?: JSX.Element;
}) => {
  const {
    groupData,
    grouping,
    isFetching,
    activePageIndex,
    pageSize,
    onChangeGroupsItemsPerPage,
    onChangeGroupsPage,
    isGroupLoading,
  } = useLatestFindingsGrouping({
    groupPanelRenderer,
    groupStatsRenderer,
    groupingLevel,
    selectedGroup,
    groupFilters: parentGroupFilters ? JSON.parse(parentGroupFilters) : [],
  });

  return (
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
      groupingLevel={groupingLevel}
      groupSelectorComponent={groupSelectorComponent}
    />
  );
};

/**
 * This component is used to render the loading state of the CloudSecurityGrouping component
 * It's used to avoid the flickering of the table when the data is loading
 */
const CloudSecurityGroupingLoading = ({
  grouping,
  pageSize,
}: Pick<CloudSecurityGroupingProps, 'grouping' | 'pageSize'>) => {
  return (
    <div data-test-subj={CSP_GROUPING_LOADING}>
      {grouping.getGrouping({
        activePage: 0,
        data: {
          groupsCount: { value: 1 },
          unitsCount: { value: 1 },
        },
        groupingLevel: 0,
        inspectButton: undefined,
        isLoading: true,
        itemsPerPage: pageSize,
        renderChildComponent: () => <></>,
        onGroupClose: () => {},
        selectedGroup: '',
        takeActionItems: () => [],
      })}
    </div>
  );
};
export const LatestFindingsContainer = () => {
  const {
    grouping,
    isFetching,
    pageSize,
    setUrlQuery,
    isGroupLoading,
    onResetFilters,
    error,
    isEmptyResults,
  } = useLatestFindingsGrouping({ groupPanelRenderer, groupStatsRenderer });

  const dataView = useLatestFindingsDataView(LATEST_FINDINGS_INDEX_PATTERN).data!;

  const renderChildComponent = ({
    level,
    currentSelectedGroup,
    selectedGroupOptions,
    parentGroupFilters,
    groupSelectorComponent,
  }: {
    level: number;
    currentSelectedGroup: string;
    selectedGroupOptions: string[];
    parentGroupFilters?: string;
    groupSelectorComponent?: JSX.Element;
  }) => {
    let getChildComponent;

    if (selectedGroupOptions.length === 1 && currentSelectedGroup === 'none') {
      return (
        <LatestFindingsTable
          groupSelectorComponent={groupSelectorComponent}
          nonPersistedFilters={[...(parentGroupFilters ? JSON.parse(parentGroupFilters) : [])]}
          height={DEFAULT_TABLE_HEIGHT}
          showDistributionBar={selectedGroupOptions.includes('none')}
        />
      );
    }

    if (level < selectedGroupOptions.length - 1 && !selectedGroupOptions.includes('none')) {
      getChildComponent = (currentGroupFilters: Filter[]) => {
        const nextGroupingLevel = level + 1;
        return renderChildComponent({
          level: nextGroupingLevel,
          currentSelectedGroup: selectedGroupOptions[nextGroupingLevel],
          selectedGroupOptions,
          parentGroupFilters: JSON.stringify([
            ...currentGroupFilters,
            ...(parentGroupFilters ? JSON.parse(parentGroupFilters) : []),
          ]),
          groupSelectorComponent,
        });
      };
    } else {
      getChildComponent = (currentGroupFilters: Filter[]) => {
        return (
          <LatestFindingsTable
            nonPersistedFilters={[
              ...currentGroupFilters,
              ...(parentGroupFilters ? JSON.parse(parentGroupFilters) : []),
            ]}
            height={DEFAULT_TABLE_HEIGHT}
            showDistributionBar={selectedGroupOptions.includes('none')}
          />
        );
      };
    }
    return (
      <SubGrouping
        renderChildComponent={getChildComponent}
        selectedGroup={selectedGroupOptions[level]}
        groupingLevel={level}
        parentGroupFilters={parentGroupFilters}
        groupSelectorComponent={groupSelectorComponent}
      />
    );
  };

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

  if (isGroupLoading && isFetching) {
    return <CloudSecurityGroupingLoading grouping={grouping} pageSize={pageSize} />;
  }

  return (
    <>
      <FindingsSearchBar dataView={dataView} setQuery={setUrlQuery} loading={isFetching} />
      <div>
        {renderChildComponent({
          level: 0,
          currentSelectedGroup: grouping.selectedGroups[0],
          selectedGroupOptions: grouping.selectedGroups,
          groupSelectorComponent: grouping.groupSelector,
        })}
      </div>
    </>
  );
};
