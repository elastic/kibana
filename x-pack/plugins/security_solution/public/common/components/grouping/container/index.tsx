/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTablePagination } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { isArray } from 'lodash/fp';
import React, { useMemo, useState } from 'react';
import type { BadgeMetric, CustomMetric } from '../accordion_panel';
import { GroupPanel } from '../accordion_panel';
import { GroupStats } from '../accordion_panel/group_stats';
import { EmptyGroupingComponent } from '../empty_resuls_panel';
import { GroupingStyledContainer, GroupsUnitCount } from '../styles';
import { GROUPS_UNIT } from '../translations';
import type { GroupingTableAggregation, RawBucket } from '../types';

interface GroupingContainerProps {
  selectedGroup: string;
  inspectButton?: JSX.Element;
  takeActionItems: (groupFilters: Filter[]) => JSX.Element[];
  data: GroupingTableAggregation &
    Record<
      string,
      {
        value?: number | null | undefined;
        buckets?:
          | Array<{
              doc_count?: number | null | undefined;
            }>
          | undefined;
      }
    >;
  groupsSelector?: JSX.Element;
  unit?: (n: number) => string;
  badgeMetricStats?: (fieldBucket: RawBucket) => BadgeMetric[];
  customMetricStats?: (fieldBucket: RawBucket) => CustomMetric[];
  renderChildComponent: (groupFilter: Filter[]) => React.ReactNode;
  pagination: {
    pageIndex: number;
    pageSize: number;
    onChangeItemsPerPage: (itemsPerPageNumber: number) => void;
    onChangePage: (pageNumber: number) => void;
  };
  groupPanelRenderer?: (fieldBucket: RawBucket) => JSX.Element;
}

const GroupingContainerComponent = ({
  selectedGroup,
  takeActionItems,
  data,
  groupsSelector,
  unit,
  badgeMetricStats,
  customMetricStats,
  renderChildComponent,
  pagination,
  inspectButton,
  groupPanelRenderer,
}: GroupingContainerProps) => {
  const [trigger, setTrigger] = useState<
    Record<string, { state: 'open' | 'closed' | undefined; selectedBucket: RawBucket }>
  >({});

  const unitCountText = useMemo(() => {
    const countBuckets = data?.alertsCount?.buckets;
    return `${(countBuckets && countBuckets.length > 0
      ? countBuckets[0].doc_count ?? 0
      : 0
    ).toLocaleString()} ${
      unit && unit(countBuckets && countBuckets.length > 0 ? countBuckets[0].doc_count ?? 0 : 0)
    }`;
  }, [data?.alertsCount?.buckets, unit]);

  const unitGroupsCountText = useMemo(() => {
    return `${(data?.groupsNumber?.value ?? 0).toLocaleString()} ${GROUPS_UNIT(
      data?.groupsNumber?.value ?? 0
    )}`;
  }, [data?.groupsNumber?.value]);

  const groupPanels = useMemo(
    () =>
      data.stackByMupltipleFields0?.buckets?.map((groupBucket) => {
        const group = isArray(groupBucket.key) ? groupBucket.key[0] : groupBucket.key;
        const groupKey = `group0-${
          isArray(groupBucket.key) ? groupBucket.key[0] : groupBucket.key
        }`;

        const groupFilters = [];
        if (groupKey && selectedGroup) {
          groupFilters.push({
            meta: {
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: selectedGroup,
              params: {
                query: group,
              },
            },
            query: {
              match_phrase: {
                [selectedGroup]: {
                  query: group,
                },
              },
            },
          });
        }
        const panel = (
          <GroupPanel
            selectedGroup={selectedGroup}
            groupBucket={groupBucket}
            forceState={trigger[groupKey] && trigger[groupKey].state}
            renderChildComponent={
              trigger[groupKey] && trigger[groupKey].state === 'open'
                ? renderChildComponent
                : () => null
            }
            onToggleGroup={(isOpen) => {
              setTrigger({
                // ...trigger, -> this change will keep only one group at a time expanded and one table displayed
                [groupKey]: {
                  state: isOpen ? 'open' : 'closed',
                  selectedBucket: groupBucket,
                },
              });
            }}
            extraAction={
              <GroupStats
                bucket={groupBucket}
                takeActionItems={takeActionItems(groupFilters)}
                badgeMetricStats={badgeMetricStats && badgeMetricStats(groupBucket)}
                customMetricStats={customMetricStats && customMetricStats(groupBucket)}
              />
            }
            groupPanelRenderer={groupPanelRenderer && groupPanelRenderer(groupBucket)}
          />
        );
        return (
          <>
            {panel}
            <EuiSpacer size="s" />
          </>
        );
      }),
    [
      badgeMetricStats,
      customMetricStats,
      data.stackByMupltipleFields0?.buckets,
      groupPanelRenderer,
      renderChildComponent,
      selectedGroup,
      takeActionItems,
      trigger,
    ]
  );

  if (data?.groupsNumber?.value === 0) {
    return <EmptyGroupingComponent />;
  }

  return (
    <>
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        style={{ paddingBottom: 20, paddingTop: 20 }}
      >
        <EuiFlexItem grow={false}>
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
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
            {inspectButton && <EuiFlexItem>{inspectButton}</EuiFlexItem>}
            <EuiFlexItem>{groupsSelector}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <GroupingStyledContainer>
        {groupPanels}
        <EuiSpacer size="m" />
        <EuiTablePagination
          data-test-subj="hostTablePaginator"
          activePage={pagination.pageIndex}
          showPerPageOptions={true}
          itemsPerPage={pagination.pageSize}
          onChangeItemsPerPage={(pageSize) => {
            pagination.onChangeItemsPerPage(pageSize);
          }}
          pageCount={
            data.groupsNumber?.value && pagination.pageSize
              ? Math.ceil(data.groupsNumber?.value / pagination.pageSize)
              : 1
          }
          onChangePage={(pageNumber) => {
            pagination.onChangePage(pageNumber);
          }}
          itemsPerPageOptions={[10, 25, 50, 100]}
        />
      </GroupingStyledContainer>
    </>
  );
};

export const GroupingContainer = React.memo(GroupingContainerComponent);
