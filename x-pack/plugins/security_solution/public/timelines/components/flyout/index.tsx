/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import React, { useCallback } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import styled from 'styled-components';

import { State } from '../../../common/store';
import { DataProvider } from '../timeline/data_providers/data_provider';
import { FlyoutButton } from './button';
import { Pane } from './pane';
import { timelineActions, timelineSelectors } from '../../store/timeline';
import { DEFAULT_TIMELINE_WIDTH } from '../timeline/body/constants';
import { StatefulTimeline } from '../timeline';
import { TimelineById } from '../../store/timeline/types';

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
  flyoutHeight: number;
  timelineId: string;
  usersViewing: string[];
}

type Props = OwnProps & ProsFromRedux;

export const FlyoutComponent = React.memo<Props>(
  ({ dataProviders, flyoutHeight, show = true, showTimeline, timelineId, usersViewing, width }) => {
    const handleClose = useCallback(() => showTimeline({ id: timelineId, show: false }), [
      showTimeline,
      timelineId,
    ]);
    const handleOpen = useCallback(() => showTimeline({ id: timelineId, show: true }), [
      showTimeline,
      timelineId,
    ]);

    return (
      <>
        <Visible show={show}>
          <Pane
            flyoutHeight={flyoutHeight}
            onClose={handleClose}
            timelineId={timelineId}
            width={width}
          >
            <StatefulTimeline onClose={handleClose} usersViewing={usersViewing} id={timelineId} />
          </Pane>
        </Visible>
        <FlyoutButton
          dataProviders={dataProviders}
          show={!show}
          timelineId={timelineId}
          onOpen={handleOpen}
        />
      </>
    );
  }
);

FlyoutComponent.displayName = 'FlyoutComponent';

const DEFAULT_DATA_PROVIDERS: DataProvider[] = [];
const DEFAULT_TIMELINE_BY_ID = {};

const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
  const timelineById: TimelineById =
    timelineSelectors.timelineByIdSelector(state) ?? DEFAULT_TIMELINE_BY_ID;
  /*
    In case timelineById[timelineId]?.dataProviders is an empty array it will cause unnecessary rerender
    of StatefulTimeline which can be expensive, so to avoid that return DEFAULT_DATA_PROVIDERS
  */
  const dataProviders = timelineById[timelineId]?.dataProviders.length
    ? timelineById[timelineId]?.dataProviders
    : DEFAULT_DATA_PROVIDERS;
  const show = timelineById[timelineId]?.show ?? false;
  const width = timelineById[timelineId]?.width ?? DEFAULT_TIMELINE_WIDTH;

  return { dataProviders, show, width };
};

const mapDispatchToProps = {
  showTimeline: timelineActions.showTimeline,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

type ProsFromRedux = ConnectedProps<typeof connector>;

export const Flyout = connector(FlyoutComponent);

Flyout.displayName = 'Flyout';
