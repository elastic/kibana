/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { TimelineTabs } from '@kbn/securitysolution-data-table';
import React from 'react';
import { InspectButton } from '../../../../common/components/inspect';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { AddToCaseButton } from '../add_to_case_button';
import { NewTimelineAction } from './new_timeline';
import { OpenTimelineAction } from './open_timeline';
import { SaveTimelineAction } from './save_timeline';

interface TimelineActionMenuProps {
  mode?: 'compact' | 'normal';
  timelineId: string;
  showInspectButton: boolean;
  isInspectButtonDisabled: boolean;
  activeTab: TimelineTabs;
}

export const TimelineActionMenu = ({
  mode = 'normal',
  timelineId,
  showInspectButton,
  activeTab,
  isInspectButtonDisabled,
}: TimelineActionMenuProps) => {
  return (
    <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd" alignItems="center">
      <EuiFlexItem data-test-subj="new-timeline-action">
        <NewTimelineAction timelineId={timelineId} />
      </EuiFlexItem>
      <EuiFlexItem data-test-subj="open-timeline-action">
        <OpenTimelineAction />
      </EuiFlexItem>
      <EuiFlexItem>
        <AddToCaseButton timelineId={timelineId} />
      </EuiFlexItem>
      <EuiFlexItem data-test-subj="inspect-timeline-action">
        <InspectButton
          compact={mode === 'compact'}
          queryId={`${timelineId}-${activeTab}`}
          inputId={InputsModelId.timeline}
          isDisabled={isInspectButtonDisabled}
          title="Inspect"
        />
      </EuiFlexItem>
      <EuiFlexItem data-test-subj="save-timeline-action">
        <SaveTimelineAction timelineId={timelineId} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
