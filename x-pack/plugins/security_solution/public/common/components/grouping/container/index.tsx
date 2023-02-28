/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiSpacer,
  EuiTablePagination,
} from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import React, { useMemo, useState } from 'react';
import { firstNonNullValue } from '../../../../../common/endpoint/models/ecs_safety_helpers';
import { createGroupFilter } from '../accordion_panel/helpers';
import { tableDefaults } from '../../../store/data_table/defaults';
import { defaultUnit } from '../../toolbar/unit';
import type { BadgeMetric, CustomMetric } from '../accordion_panel';
import { GroupPanel } from '../accordion_panel';
import { GroupStats } from '../accordion_panel/group_stats';
import { EmptyGroupingComponent } from '../empty_resuls_panel';
import { GroupingStyledContainer, GroupsUnitCount } from '../styles';
import { GROUPS_UNIT } from '../translations';
import type { GroupingTableAggregation, RawBucket } from '../types';

interface GroupingContainerProps {
  badgeMetricStats?: (fieldBucket: RawBucket) => BadgeMetric[];
  customMetricStats?: (fieldBucket: RawBucket) => CustomMetric[];
  data: GroupingTableAggregation &
    Record<
      string,
      {
        value?: number | null;
        buckets?: Array<{
          doc_count?: number | null;
        }>;
      }
    >;
  groupPanelRenderer?: (fieldBucket: RawBucket) => JSX.Element | undefined;
  groupsSelector?: JSX.Element;
  inspectButton?: JSX.Element;
  isLoading: boolean;
  pagination: {
    pageIndex: number;
    pageSize: number;
    onChangeItemsPerPage: (itemsPerPageNumber: number) => void;
    onChangePage: (pageNumber: number) => void;
  };
  renderChildComponent: (groupFilter: Filter[]) => React.ReactNode;
  selectedGroup: string;
  takeActionItems: (groupFilters: Filter[]) => JSX.Element[];
  unit?: (n: number) => string;
}

const GroupingContainerComponent = ({
  badgeMetricStats,
  customMetricStats,
  data,
  groupPanelRenderer,
  groupsSelector,
  inspectButton,
  isLoading,
  pagination,
  renderChildComponent,
  selectedGroup,
  takeActionItems,
  unit = defaultUnit,
}: GroupingContainerProps) => {
  const [trigger, setTrigger] = useState<
    Record<string, { state: 'open' | 'closed' | undefined; selectedBucket: RawBucket }>
  >({});

  const groupsNumber = data?.groupsNumber?.value ?? 0;
  const unitCountText = useMemo(() => {
    const count = data?.alertsCount?.value ?? 0;
    return `${count.toLocaleString()} ${unit && unit(count)}`;
  }, [data?.alertsCount?.value, unit]);

  const unitGroupsCountText = useMemo(
    () => `${groupsNumber.toLocaleString()} ${GROUPS_UNIT(groupsNumber)}`,
    [groupsNumber]
  );

  const groupPanels = useMemo(
    () =>
      data.stackByMultipleFields0?.buckets?.map((groupBucket) => {
        const group = firstNonNullValue(groupBucket.key);
        const groupKey = `group0-${group}`;

        return (
          <span key={groupKey}>
            <GroupPanel
              extraAction={
                <GroupStats
                  bucket={groupBucket}
                  takeActionItems={takeActionItems(createGroupFilter(selectedGroup, group))}
                  badgeMetricStats={badgeMetricStats && badgeMetricStats(groupBucket)}
                  customMetricStats={customMetricStats && customMetricStats(groupBucket)}
                />
              }
              forceState={(trigger[groupKey] && trigger[groupKey].state) ?? 'closed'}
              groupBucket={groupBucket}
              groupPanelRenderer={groupPanelRenderer && groupPanelRenderer(groupBucket)}
              isLoading={isLoading}
              onToggleGroup={(isOpen) => {
                setTrigger({
                  // ...trigger, -> this change will keep only one group at a time expanded and one table displayed
                  [groupKey]: {
                    state: isOpen ? 'open' : 'closed',
                    selectedBucket: groupBucket,
                  },
                });
              }}
              renderChildComponent={
                trigger[groupKey] && trigger[groupKey].state === 'open'
                  ? renderChildComponent
                  : () => null
              }
              selectedGroup={selectedGroup}
            />
            <EuiSpacer size="s" />
          </span>
        );
      }),
    [
      badgeMetricStats,
      customMetricStats,
      data.stackByMultipleFields0?.buckets,
      groupPanelRenderer,
      isLoading,
      renderChildComponent,
      selectedGroup,
      takeActionItems,
      trigger,
    ]
  );
  const pageCount = useMemo(
    () => (groupsNumber && pagination.pageSize ? Math.ceil(groupsNumber / pagination.pageSize) : 1),
    [groupsNumber, pagination.pageSize]
  );
  return (
    <>
      <EuiFlexGroup
        data-test-subj="grouping-table"
        justifyContent="spaceBetween"
        alignItems="center"
        style={{ paddingBottom: 20, paddingTop: 20 }}
      >
        <EuiFlexItem grow={false}>
          {groupsNumber > 0 ? (
            <EuiFlexGroup gutterSize="none">
              <EuiFlexItem grow={false}>
                <GroupsUnitCount data-test-subj="alert-count">{unitCountText}</GroupsUnitCount>
              </EuiFlexItem>
              <EuiFlexItem>
                <GroupsUnitCount data-test-subj="groups-count" style={{ borderRight: 'none' }}>
                  {unitGroupsCountText}
                </GroupsUnitCount>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : null}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs">
            {inspectButton && <EuiFlexItem>{inspectButton}</EuiFlexItem>}
            <EuiFlexItem>{groupsSelector}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <GroupingStyledContainer className="eui-xScroll">
        {groupsNumber > 0 ? (
          <>
            {groupPanels}
            <EuiSpacer size="m" />
            <EuiTablePagination
              activePage={pagination.pageIndex}
              data-test-subj="grouping-table-pagination"
              itemsPerPage={pagination.pageSize}
              itemsPerPageOptions={tableDefaults.itemsPerPageOptions}
              onChangeItemsPerPage={pagination.onChangeItemsPerPage}
              onChangePage={pagination.onChangePage}
              pageCount={pageCount}
              showPerPageOptions
            />
          </>
        ) : (
          <>
            {isLoading && (
              <EuiProgress data-test-subj="is-loading-grouping-table" size="xs" color="accent" />
            )}
            <EmptyGroupingComponent />
          </>
        )}
      </GroupingStyledContainer>
    </>
  );
};

export const GroupingContainer = React.memo(GroupingContainerComponent);
