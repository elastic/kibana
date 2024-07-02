/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { Filter } from '@kbn/es-query';
import { EuiSpacer } from '@elastic/eui';
import { DEFAULT_GROUPING_TABLE_HEIGHT } from '../../../common/constants';
import { EmptyState } from '../../../components/empty_state';
import { CloudSecurityGrouping } from '../../../components/cloud_security_grouping';
import { FindingsSearchBar } from '../layout/findings_search_bar';
import { useLatestFindingsGrouping } from './use_latest_findings_grouping';
import { LatestFindingsTable } from './latest_findings_table';
import { groupPanelRenderer, groupStatsRenderer } from './latest_findings_group_renderer';
import { ErrorCallout } from '../layout/error_callout';

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
    setActivePageIndex,
  } = useLatestFindingsGrouping({
    groupPanelRenderer,
    groupStatsRenderer,
    groupingLevel,
    selectedGroup,
    groupFilters: parentGroupFilters ? JSON.parse(parentGroupFilters) : [],
  });

  /**
   * This is used to reset the active page index when the selected group changes
   * It is needed because the grouping number of pages can change according to the selected group
   */
  useEffect(() => {
    setActivePageIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup]);

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

export const LatestFindingsContainer = () => {
  const { grouping, isFetching, urlQuery, setUrlQuery, onResetFilters, error, isEmptyResults } =
    useLatestFindingsGrouping({ groupPanelRenderer, groupStatsRenderer });

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

    if (currentSelectedGroup === 'none') {
      return (
        <LatestFindingsTable
          groupSelectorComponent={groupSelectorComponent}
          nonPersistedFilters={[...(parentGroupFilters ? JSON.parse(parentGroupFilters) : [])]}
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
            height={DEFAULT_GROUPING_TABLE_HEIGHT}
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
        <FindingsSearchBar query={urlQuery} setQuery={setUrlQuery} loading={isFetching} />
        <EuiSpacer size="m" />
        {error && <ErrorCallout error={error} />}
        {isEmptyResults && <EmptyState onResetFilters={onResetFilters} />}
      </>
    );
  }

  return (
    <>
      <FindingsSearchBar query={urlQuery} setQuery={setUrlQuery} loading={isFetching} />
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
