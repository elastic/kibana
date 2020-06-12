/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlyout } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { Resizable, ResizeCallback } from 're-resizable';

import { TimelineResizeHandle } from './timeline_resize_handle';
import { EventDetailsWidthProvider } from '../../../../common/components/events_viewer/event_details_width_context';

import * as i18n from './translations';
import { timelineActions } from '../../../store/timeline';

const minWidthPixels = 550; // do not allow the flyout to shrink below this width (pixels)
const maxWidthPercent = 95; // do not allow the flyout to grow past this percentage of the view
interface FlyoutPaneComponentProps {
  children: React.ReactNode;
  flyoutHeight: number;
  onClose: () => void;
  timelineId: string;
  width: number;
}

const EuiFlyoutContainer = styled.div`
  .timeline-flyout {
    min-width: 150px;
    width: auto;
  }
`;

const StyledResizable = styled(Resizable)`
  display: flex;
  flex-direction: column;
`;

const RESIZABLE_ENABLE = { left: true };

const FlyoutPaneComponent: React.FC<FlyoutPaneComponentProps> = ({
  children,
  flyoutHeight,
  onClose,
  timelineId,
  width,
}) => {
  const dispatch = useDispatch();

  const onResizeStop: ResizeCallback = useCallback(
    (_e, _direction, _ref, delta) => {
      const bodyClientWidthPixels = document.body.clientWidth;

      if (delta.width) {
        dispatch(
          timelineActions.applyDeltaToWidth({
            bodyClientWidthPixels,
            delta: -delta.width,
            id: timelineId,
            maxWidthPercent,
            minWidthPixels,
          })
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch]
  );
  const resizableDefaultSize = useMemo(
    () => ({
      width,
      height: '100%',
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const resizableHandleComponent = useMemo(
    () => ({
      left: <TimelineResizeHandle data-test-subj="flyout-resize-handle" height={flyoutHeight} />,
    }),
    [flyoutHeight]
  );

  return (
    <EuiFlyoutContainer data-test-subj="flyout-pane">
      <EuiFlyout
        aria-label={i18n.TIMELINE_DESCRIPTION}
        className="timeline-flyout"
        data-test-subj="eui-flyout"
        hideCloseButton={true}
        onClose={onClose}
        size="l"
      >
        <StyledResizable
          enable={RESIZABLE_ENABLE}
          defaultSize={resizableDefaultSize}
          minWidth={minWidthPixels}
          maxWidth={`${maxWidthPercent}vw`}
          handleComponent={resizableHandleComponent}
          onResizeStop={onResizeStop}
        >
          <EventDetailsWidthProvider>{children}</EventDetailsWidthProvider>
        </StyledResizable>
      </EuiFlyout>
    </EuiFlyoutContainer>
  );
};

export const Pane = React.memo(FlyoutPaneComponent);

Pane.displayName = 'Pane';
