/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Filter } from '@kbn/es-query';
import { EuiSpacer } from '@elastic/eui';
import { useGetGroupSelectorStateless } from '@kbn/securitysolution-grouping/src/hooks/use_get_group_selector';
import {
  GROUPING_ID,
  MAX_GROUPING_LEVELS,
} from '@kbn/cloud-security-posture-plugin/public/components/cloud_security_grouping/use_cloud_security_grouping';
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
  setSelectedGroups,
}: {
  renderChildComponent: (groupFilters: Filter[]) => JSX.Element;
  groupingLevel: number;
  parentGroupFilters?: string;
  selectedGroup: string;
  setSelectedGroups: (selectedGroups: string[]) => void;
}) => {
  // This is the callback that will be called when the user changes the group selector from the grouping component
  const onGroupChange = (param: {
    groupByField: string;
    tableId: string;
    selectedGroups: string[];
  }) => {
    setSelectedGroups(param.selectedGroups);
  };

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
    onGroupChange,
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
  const [selectedGroups, setSelectedGroups] = useState<string[]>(grouping.selectedGroups);

  // Initializes the selected groups with Grouping Component state selected groups
  useEffect(() => {
    setSelectedGroups(grouping.selectedGroups);
  }, [grouping.selectedGroups]);

  const onStatelessGroupSelectorChange = useCallback((statelessSelectedGroups: string[]) => {
    setSelectedGroups(statelessSelectedGroups);
  }, []);

  const statelessGroupSelector = useGetGroupSelectorStateless({
    groupingId: GROUPING_ID,
    onGroupChange: onStatelessGroupSelectorChange,
    fields: grouping.groupSelector.props.fields,
    defaultGroupingOptions: grouping.groupSelector.props.options,
    maxGroupingLevels: MAX_GROUPING_LEVELS,
  });

  const renderChildComponent = (
    level: number,
    currentSelectedGroup: string,
    selectedGroupOptions: string[],
    setSelectedGroupOptions: (selectedGroups: string[]) => void,
    parentGroupFilters?: string
  ) => {
    let getChildComponent;
    const hiddenGroupSelector =
      level === selectedGroupOptions.length - 1 && !selectedGroupOptions.includes('none');

    if (level < selectedGroupOptions.length - 1 && !selectedGroupOptions.includes('none')) {
      getChildComponent = (currentGroupFilters: Filter[]) => {
        const nextGroupingLevel = level + 1;
        return renderChildComponent(
          nextGroupingLevel,
          selectedGroupOptions[nextGroupingLevel],
          selectedGroupOptions,
          setSelectedGroupOptions,
          JSON.stringify([
            ...currentGroupFilters,
            ...(parentGroupFilters ? JSON.parse(parentGroupFilters) : []),
          ])
        );
      };
    } else {
      getChildComponent = (currentGroupFilters: Filter[]) => {
        return (
          <LatestFindingsTable
            groupSelectorComponent={hiddenGroupSelector ? undefined : statelessGroupSelector}
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
        setSelectedGroups={setSelectedGroupOptions}
        parentGroupFilters={parentGroupFilters}
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
        <EuiSpacer size="m" />
        {renderChildComponent(0, selectedGroups[0], selectedGroups, setSelectedGroups)}
      </div>
    </>
  );
};
