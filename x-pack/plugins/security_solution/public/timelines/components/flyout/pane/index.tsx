/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlyout } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { StatefulTimeline } from '../../timeline';
import * as i18n from './translations';

interface FlyoutPaneComponentProps {
  onClose: () => void;
  timelineId: string;
  usersViewing: string[];
}

const EuiFlyoutContainer = styled.div`
  .timeline-flyout {
    z-index: 4001;
    min-width: 150px;
    width: 100%;
    animation: none;
  }
`;

const FlyoutPaneComponent: React.FC<FlyoutPaneComponentProps> = ({
  onClose,
  timelineId,
  usersViewing,
}) => (
  <EuiFlyoutContainer data-test-subj="flyout-pane">
    <EuiFlyout
      aria-label={i18n.TIMELINE_DESCRIPTION}
      className="timeline-flyout"
      data-test-subj="eui-flyout"
      hideCloseButton={true}
      onClose={onClose}
      size="l"
    >
      <StatefulTimeline onClose={onClose} usersViewing={usersViewing} id={timelineId} />
    </EuiFlyout>
  </EuiFlyoutContainer>
);

export const Pane = React.memo(FlyoutPaneComponent);

Pane.displayName = 'Pane';
