/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTablePagination } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { isArray } from 'lodash/fp';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import uuid from 'uuid';
import { GroupingAccordion } from '../accordion_panel';
import type { GroupSelection } from '../groups_selector';
import { GroupsUnitCount } from '../styles';
import { GROUPS_UNIT } from '../translations';
import type { GroupingTableAggregation, RawBucket } from '../types';
import { DEFAULT_GROUPING_QUERY_ID } from '../types';

export const GroupingStyledContainer = styled.div`
  .euiAccordion__childWrapper {
    border-bottom: 1px solid #d3dae6;
    border-radius: 5px;
  }
  .euiAccordion__triggerWrapper {
    border-bottom: 1px solid #d3dae6;
    border-radius: 5px;
    min-height: 77px;
  }
  .euiAccordionForm {
    border-top: 1px solid #d3dae6;
    border-left: 1px solid #d3dae6;
    border-right: 1px solid #d3dae6;
    border-bottom: none;
    border-radius: 5px;
  }
`;

interface GroupingContainerProps {
  selectedGroup: GroupSelection;
  takeActionItems: JSX.Element[];
  groupsData: GroupingTableAggregation &
    Record<string, { value?: number | null; buckets?: Array<{ doc_count?: number | null }> }>;
  groupsSelector?: JSX.Element;
  groupingId?: string;
  onGroupPanelExpand: (bucket?: RawBucket) => void;
  unitCountText?: (n: number) => string;
}

const GroupingContainerComponent = ({
  selectedGroup,
  takeActionItems,
  groupsData,
  groupsSelector,
  groupingId = DEFAULT_GROUPING_QUERY_ID,
  onGroupPanelExpand,
  unitCountText,
}: GroupingContainerProps) => {
  const [activePage, setActivePage] = useState<number>(0);
  const [groupsPageSize, setShowPerPageOptions] = useState<number>(5);
  const [selectedBucket, setSelectedBucket] = useState<RawBucket>();

  const onOpenGroupAction = useCallback(
    (bucket: RawBucket) => {
      setSelectedBucket(bucket);
      onGroupPanelExpand(bucket);
    },
    [onGroupPanelExpand]
  );
  // create a unique, but stable (across re-renders) query id
  const uniqueQueryId = useMemo(() => `${groupingId}-${uuid.v4()}`, [groupingId]);

  const goToPage = (pageNumber: number) => {
    setActivePage(pageNumber);
  };

  const unitGroupsCountText = useMemo(() => {
    return `${(groupsData?.groupsCount0?.value ?? 0).toLocaleString()} ${GROUPS_UNIT(
      groupsData?.groupsCount0?.value ?? 0
    )}`;
  }, [groupsData?.groupsCount0?.value]);

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
        <EuiFlexItem grow={false}>{groupsSelector}</EuiFlexItem>
      </EuiFlexGroup>
      <GroupingStyledContainer>
        {groupsData.stackByMupltipleFields0?.buckets?.map((groupBucket) => (
          <>
            <GroupingAccordion
              selectedGroup={selectedGroup}
              groupBucket={groupBucket}
              renderChildComponent={}
extraAction={(
  <GroupRightPanel
    bucket={groupBucket}
    takeActionItems={takeActionItems}
    onTakeActionsOpen={() => onOpenGroupAction && onOpenGroupAction(groupBucket)}
    badgeStats={}
    customStats={}
  />
)}
            />
            <EuiSpacer size="s" />
          </>
        ))}
        <EuiSpacer size="m" />
        {(groupsData.groupsNumber?.value && groupsPageSize
          ? Math.ceil(groupsData.groupsNumber?.value / groupsPageSize)
          : 0) > 1 && (
          <EuiTablePagination
            data-test-subj="hostTablePaginator"
            activePage={activePage}
            showPerPageOptions={true}
            itemsPerPage={groupsPageSize}
            onChangeItemsPerPage={(pageSize) => {
              setShowPerPageOptions(pageSize);
            }}
            pageCount={
              groupsData.groupsNumber?.value && groupsPageSize
                ? Math.ceil(groupsData.groupsNumber?.value / groupsPageSize)
                : 0
            }
            onChangePage={goToPage}
            itemsPerPageOptions={[5, 10, 20, 50]}
          />
        )}
      </GroupingStyledContainer>
    </>
  );
};

export const GroupingContainer = React.memo(GroupingContainerComponent);
