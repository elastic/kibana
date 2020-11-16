/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

import { FlyoutBottomBar } from './button';
import { Pane } from './pane';
import { timelineSelectors } from '../../store/timeline';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { timelineDefaults } from '../../store/timeline/defaults';

const Visible = styled.div<{ show?: boolean }>`
  visibility: ${({ show }) => (show ? 'visible' : 'hidden')};
`;

Visible.displayName = 'Visible';

interface OwnProps {
  timelineId: string;
}

const FlyoutComponent: React.FC<OwnProps> = ({ timelineId }) => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const { show = false } = useDeepEqualSelector(
    (state) => getTimeline(state, timelineId) ?? timelineDefaults
  );

  return (
    <>
      <Visible show={show}>
        <Pane timelineId={timelineId} />
      </Visible>
      <FlyoutBottomBar show={!show} timelineId={timelineId} />
    </>
  );
};

FlyoutComponent.displayName = 'FlyoutComponent';

export const Flyout = React.memo(FlyoutComponent);

Flyout.displayName = 'Flyout';
