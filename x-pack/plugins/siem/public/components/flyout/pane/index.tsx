/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiToolTip } from '@elastic/eui';
import * as React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import styled from 'styled-components';
import { ActionCreator } from 'typescript-fsa';

import { OnResize, Resizeable } from '../../resize_handle';
import { TimelineResizeHandle } from '../../resize_handle/styled_handles';
import { FlyoutHeader } from '../header';

import * as i18n from './translations';
import { timelineActions } from '../../../store/actions';

const minWidthPixels = 550; // do not allow the flyout to shrink below this width (pixels)
const maxWidthPercent = 95; // do not allow the flyout to grow past this percentage of the view
interface OwnProps {
  children: React.ReactNode;
  flyoutHeight: number;
  headerHeight: number;
  onClose: () => void;
  timelineId: string;
  usersViewing: string[];
  width: number;
}

interface DispatchProps {
  applyDeltaToWidth: ActionCreator<{
    id: string;
    delta: number;
    bodyClientWidthPixels: number;
    maxWidthPercent: number;
    minWidthPixels: number;
  }>;
}

type Props = OwnProps & DispatchProps;

const EuiFlyoutContainer = styled.div<{ headerHeight: number; width: number }>`
  .timeline-flyout {
    min-width: 150px;
    width: ${({ width }) => `${width}px`};
  }
  .timeline-flyout-header {
    align-items: center;
    box-shadow: none;
    display: flex;
    flex-direction: row;
    height: ${({ headerHeight }) => `${headerHeight}px`};
    max-height: ${({ headerHeight }) => `${headerHeight}px`};
    overflow: hidden;
    padding: 5px 0 0 10px;
  }
  .timeline-flyout-body {
    overflow-y: hidden;
    padding: 0;
    .euiFlyoutBody__overflow {
      padding: 0;
    }
  }
`;

const FlyoutHeaderContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
`;

// manually wrap the close button because EuiButtonIcon can't be a wrapped `styled`
const WrappedCloseButton = styled.div`
  margin-right: 5px;
`;

const FlyoutHeaderWithCloseButton = pure<{
  onClose: () => void;
  timelineId: string;
  usersViewing: string[];
}>(({ onClose, timelineId, usersViewing }) => (
  <FlyoutHeaderContainer>
    <WrappedCloseButton>
      <EuiToolTip content={i18n.CLOSE_TIMELINE}>
        <EuiButtonIcon
          aria-label={i18n.CLOSE_TIMELINE}
          data-test-subj="close-timeline"
          iconType="cross"
          onClick={onClose}
        />
      </EuiToolTip>
    </WrappedCloseButton>
    <FlyoutHeader timelineId={timelineId} usersViewing={usersViewing} />
  </FlyoutHeaderContainer>
));

class FlyoutPaneComponent extends React.PureComponent<Props> {
  public render() {
    const {
      children,
      flyoutHeight,
      headerHeight,
      onClose,
      timelineId,
      usersViewing,
      width,
    } = this.props;

    return (
      <EuiFlyoutContainer headerHeight={headerHeight} data-test-subj="flyout-pane" width={width}>
        <EuiFlyout
          aria-label={i18n.TIMELINE_DESCRIPTION}
          className="timeline-flyout"
          data-test-subj="eui-flyout"
          hideCloseButton={true}
          maxWidth={`${maxWidthPercent}%`}
          onClose={onClose}
          size="l"
        >
          <Resizeable
            handle={
              <TimelineResizeHandle data-test-subj="flyout-resize-handle" height={flyoutHeight} />
            }
            id={timelineId}
            onResize={this.onResize}
            render={this.renderFlyout}
          />
          <EuiFlyoutHeader
            className="timeline-flyout-header"
            data-test-subj="eui-flyout-header"
            hasBorder={false}
          >
            <FlyoutHeaderWithCloseButton
              onClose={onClose}
              timelineId={timelineId}
              usersViewing={usersViewing}
            />
          </EuiFlyoutHeader>
          <EuiFlyoutBody data-test-subj="eui-flyout-body" className="timeline-flyout-body">
            {children}
          </EuiFlyoutBody>
        </EuiFlyout>
      </EuiFlyoutContainer>
    );
  }

  private renderFlyout = () => <></>;

  private onResize: OnResize = ({ delta, id }) => {
    const { applyDeltaToWidth } = this.props;

    const bodyClientWidthPixels = document.body.clientWidth;

    applyDeltaToWidth({
      bodyClientWidthPixels,
      delta,
      id,
      maxWidthPercent,
      minWidthPixels,
    });
  };
}

export const Pane = connect(
  null,
  {
    applyDeltaToWidth: timelineActions.applyDeltaToWidth,
  }
)(FlyoutPaneComponent);
