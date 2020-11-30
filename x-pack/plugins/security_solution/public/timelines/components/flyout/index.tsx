/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { DataProvider } from '../timeline/data_providers/data_provider';
import { FlyoutButton } from './button';
import { Pane } from './pane';
import { timelineActions, timelineSelectors } from '../../store/timeline';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';

export const Badge = (styled(EuiBadge)`
  position: absolute;
  padding-left: 4px;
  padding-right: 4px;
  right: 0%;
  top: 0%;
  border-bottom-left-radius: 5px;
` as unknown) as typeof EuiBadge;

Badge.displayName = 'Badge';

const Visible = styled.div<{ show?: boolean }>`
  visibility: ${({ show }) => (show ? 'visible' : 'hidden')};
`;

Visible.displayName = 'Visible';

interface OwnProps {
  timelineId: string;
  usersViewing: string[];
}

const DEFAULT_DATA_PROVIDERS: DataProvider[] = [];
const DEFAULT_TIMELINE_BY_ID = {};

const FlyoutComponent: React.FC<OwnProps> = ({ timelineId, usersViewing }) => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const dispatch = useDispatch();
  const { dataProviders = DEFAULT_DATA_PROVIDERS, show = false } = useDeepEqualSelector(
    (state) => getTimeline(state, timelineId) ?? DEFAULT_TIMELINE_BY_ID
  );
  const handleClose = useCallback(
    () => dispatch(timelineActions.showTimeline({ id: timelineId, show: false })),
    [dispatch, timelineId]
  );
  const handleOpen = useCallback(
    () => dispatch(timelineActions.showTimeline({ id: timelineId, show: true })),
    [dispatch, timelineId]
  );

  return (
    <>
      <Visible show={show}>
        <Pane onClose={handleClose} timelineId={timelineId} usersViewing={usersViewing} />
      </Visible>
      <FlyoutButton
        dataProviders={dataProviders}
        show={!show}
        timelineId={timelineId}
        onOpen={handleOpen}
      />
    </>
  );
};

FlyoutComponent.displayName = 'FlyoutComponent';

export const Flyout = React.memo(FlyoutComponent);

Flyout.displayName = 'Flyout';
