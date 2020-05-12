/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import {
  EuiFilterButton,
  EuiFilterSelectItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiSpacer,
} from '@elastic/eui';
import * as i18n from './translations';
import { SiemJob } from '../../types';
import { toggleSelectedGroup } from './toggle_selected_group';

interface GroupsFilterPopoverProps {
  siemJobs: SiemJob[];
  onSelectedGroupsChanged: Dispatch<SetStateAction<string[]>>;
}

/**
 * Popover for selecting which SiemJob groups to filter on. Component extracts unique groups and
 * their counts from the provided SiemJobs. The 'siem' group is filtered out as all jobs will be
 * siem jobs
 *
 * @param siemJobs jobs to fetch groups from to display for filtering
 * @param onSelectedGroupsChanged change listener to be notified when group selection changes
 */
export const GroupsFilterPopoverComponent = ({
  siemJobs,
  onSelectedGroupsChanged,
}: GroupsFilterPopoverProps) => {
  const [isGroupPopoverOpen, setIsGroupPopoverOpen] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  const groups = siemJobs
    .map(j => j.groups)
    .flat()
    .filter(g => g !== 'siem');
  const uniqueGroups = Array.from(new Set(groups));

  useEffect(() => {
    onSelectedGroupsChanged(selectedGroups);
  }, [selectedGroups.sort().join()]);

  return (
    <EuiPopover
      ownFocus
      button={
        <EuiFilterButton
          data-test-subj={'groups-filter-popover-button'}
          iconType="arrowDown"
          onClick={() => setIsGroupPopoverOpen(!isGroupPopoverOpen)}
          isSelected={isGroupPopoverOpen}
          hasActiveFilters={selectedGroups.length > 0}
          numActiveFilters={selectedGroups.length}
        >
          {i18n.GROUPS}
        </EuiFilterButton>
      }
      isOpen={isGroupPopoverOpen}
      closePopover={() => setIsGroupPopoverOpen(!isGroupPopoverOpen)}
      panelPaddingSize="none"
    >
      {uniqueGroups.map((group, index) => (
        <EuiFilterSelectItem
          checked={selectedGroups.includes(group) ? 'on' : undefined}
          key={`${index}-${group}`}
          onClick={() => toggleSelectedGroup(group, selectedGroups, setSelectedGroups)}
        >
          {`${group} (${groups.filter(g => g === group).length})`}
        </EuiFilterSelectItem>
      ))}
      {uniqueGroups.length === 0 && (
        <EuiFlexGroup gutterSize="m" justifyContent="spaceAround">
          <EuiFlexItem grow={true}>
            <EuiIcon type="minusInCircle" />
            <EuiSpacer size="xs" />
            <p>{i18n.NO_GROUPS_AVAILABLE}</p>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPopover>
  );
};

GroupsFilterPopoverComponent.displayName = 'GroupsFilterPopoverComponent';

export const GroupsFilterPopover = React.memo(GroupsFilterPopoverComponent);

GroupsFilterPopover.displayName = 'GroupsFilterPopover';
