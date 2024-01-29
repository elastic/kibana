/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { AttachToCaseButton } from '../../modal/actions/attach_to_case_button';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { APP_ID } from '../../../../../common';
import type { TimelineTabs } from '../../../../../common/types';
import { InspectButton } from '../../../../common/components/inspect';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { NewTimelineButton } from '../../modal/actions/new_timeline_button';
import { SaveTimelineButton } from '../../modal/actions/save_timeline_button';
import { OpenTimelineButton } from '../../modal/actions/open_timeline_button';
import { TIMELINE_TOUR_CONFIG_ANCHORS } from '../../timeline/tour/step_config';

interface TimelineActionMenuProps {
  mode?: 'compact' | 'normal';
  timelineId: string;
  isInspectButtonDisabled: boolean;
  activeTab: TimelineTabs;
}

const VerticalDivider = styled.span`
  width: 0px;
  height: 20px;
  border-left: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
`;

const TimelineActionMenuComponent = ({
  mode = 'normal',
  timelineId,
  activeTab,
  isInspectButtonDisabled,
}: TimelineActionMenuProps) => {
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
      <EuiFlexItem data-test-subj="inspect-timeline-action">
        <InspectButton
          compact={mode === 'compact'}
          queryId={`${timelineId}-${activeTab}`}
          inputId={InputsModelId.timeline}
          isDisabled={isInspectButtonDisabled}
          title=""
        />
      </EuiFlexItem>
      {userCasesPermissions.create && userCasesPermissions.read ? (
        <>
          <EuiFlexItem>
            <VerticalDivider />
          </EuiFlexItem>
          <EuiFlexItem>
            <AttachToCaseButton timelineId={timelineId} />
          </EuiFlexItem>
        </>
      ) : null}
      <EuiFlexItem data-test-subj="save-timeline-action">
        <SaveTimelineButton timelineId={timelineId} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const TimelineActionMenu = React.memo(TimelineActionMenuComponent);
