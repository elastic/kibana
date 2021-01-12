/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlyout } from '@elastic/eui';
import React, { useCallback } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import { StatefulTimeline } from '../../timeline';
import * as i18n from './translations';
import { timelineActions } from '../../../store/timeline';

interface FlyoutPaneComponentProps {
  timelineId: string;
}

const EuiFlyoutContainer = styled.div`
  .timeline-flyout {
    z-index: ${({ theme }) => theme.eui.euiZLevel8};
    min-width: 150px;
    width: 100%;
    animation: none;
  }
`;

const FlyoutPaneComponent: React.FC<FlyoutPaneComponentProps> = ({ timelineId }) => {
  const dispatch = useDispatch();
  const handleClose = useCallback(
    () => dispatch(timelineActions.showTimeline({ id: timelineId, show: false })),
    [dispatch, timelineId]
  );

  return (
    <EuiFlyoutContainer data-test-subj="flyout-pane">
      <EuiFlyout
        aria-label={i18n.TIMELINE_DESCRIPTION}
        className="timeline-flyout"
        data-test-subj="eui-flyout"
        hideCloseButton={true}
        onClose={handleClose}
        size="l"
      >
        <StatefulTimeline timelineId={timelineId} />
      </EuiFlyout>
    </EuiFlyoutContainer>
  );
};

export const Pane = React.memo(FlyoutPaneComponent);

Pane.displayName = 'Pane';
