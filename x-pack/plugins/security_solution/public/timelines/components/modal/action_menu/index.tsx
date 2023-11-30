/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { APP_ID } from '../../../../../common';
import type { TimelineTabs } from '../../../../../common/types';
import { InspectButton } from '../../../../common/components/inspect';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { AddToCaseButton } from './add_to_case_button';
import { NewTimelineButton } from './new_timeline_button';
import { SaveTimelineButton } from './save_timeline_button';
import { OpenTimelineButton } from './open_timeline_button';
import { TIMELINE_TOUR_CONFIG_ANCHORS } from '../../timeline/tour/step_config';

interface TimelineActionMenuProps {
  /**
   * Id of the timeline to be displayed within the portal
   */
  timelineId: string;
  /**
   * If true the inspect button will be disabled
   */
  isInspectButtonDisabled: boolean;
  /**
   * Passed to the inspect button to drive the query id
   */
  activeTab: TimelineTabs;
}

/**
 * This component renders all the actions available in the timeline modal header
 */
export const TimelineActionMenu = React.memo(
  ({ timelineId, activeTab, isInspectButtonDisabled }: TimelineActionMenuProps) => {
    const { cases } = useKibana().services;
    const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);

    return (
      <EuiFlexGroup
        id={TIMELINE_TOUR_CONFIG_ANCHORS.ACTION_MENU}
        gutterSize="xs"
        justifyContent="flexEnd"
        alignItems="center"
        responsive={false}
        data-test-subj="timeline-action-menu"
      >
        <EuiFlexItem data-test-subj="new-timeline-action">
          <NewTimelineButton timelineId={timelineId} />
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="open-timeline-action">
          <OpenTimelineButton />
        </EuiFlexItem>
        {userCasesPermissions.create && userCasesPermissions.read ? (
          <EuiFlexItem>
            <AddToCaseButton timelineId={timelineId} />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem data-test-subj="inspect-timeline-action">
          <InspectButton
            queryId={`${timelineId}-${activeTab}`}
            inputId={InputsModelId.timeline}
            isDisabled={isInspectButtonDisabled}
            title=""
          />
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="save-timeline-action">
          <SaveTimelineButton timelineId={timelineId} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

TimelineActionMenu.displayName = 'TimelineActionMenu';
