/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiButtonEmptyProps,
  EuiButtonIcon,
  EuiButtonIconProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { BackgroundSessionViewState } from '../background_session_state';

export interface BackgroundSessionIndicatorProps {
  state: BackgroundSessionViewState;
  onContinueInBackground?: () => {};
  onStopLoading?: () => {};
  onViewBackgroundRequests?: () => {};
  onSaveResults?: () => {};
  onReload?: () => {};
}

const backgroundSessionIndicatorViewStateToProps: {
  [state in BackgroundSessionViewState]: {
    button: Pick<EuiButtonIconProps, 'color' | 'iconType' | 'aria-label'> & { tooltipText: string };
    popover: {
      text: string;
      primaryAction?: React.ComponentType<
        BackgroundSessionIndicatorProps & { buttonProps: EuiButtonEmptyProps }
      >;
      secondaryAction?: React.ComponentType<
        BackgroundSessionIndicatorProps & { buttonProps: EuiButtonEmptyProps }
      >;
    };
  };
} = {
  [BackgroundSessionViewState.Loading]: {
    button: {
      color: 'subdued',
      iconType: 'clock',
      'aria-label': 'Loading results',
      tooltipText: 'Loading results',
    },
    popover: {
      text: 'Loading',
      primaryAction: ({ onStopLoading = () => {}, buttonProps = {} }) => (
        <EuiButtonEmpty onClick={onStopLoading} {...buttonProps}>
          Cancel
        </EuiButtonEmpty>
      ),
      secondaryAction: ({ onContinueInBackground = () => {}, buttonProps = {} }) => (
        <EuiButtonEmpty onClick={onContinueInBackground} {...buttonProps}>
          Continue in background
        </EuiButtonEmpty>
      ),
    },
  },
  [BackgroundSessionViewState.Completed]: {
    button: {
      color: 'subdued',
      iconType: 'checkInCircleFilled',
      'aria-label': 'Results loaded',
      tooltipText: 'Results loaded',
    },
    popover: {
      text: 'Results loaded',
      primaryAction: ({ onSaveResults = () => {}, buttonProps = {} }) => (
        <EuiButtonEmpty onClick={onSaveResults} {...buttonProps}>
          Save
        </EuiButtonEmpty>
      ),
      secondaryAction: ({ onViewBackgroundRequests = () => {}, buttonProps = {} }) => (
        // TODO: make this a link
        <EuiButtonEmpty onClick={onViewBackgroundRequests} {...buttonProps}>
          View background sessions
        </EuiButtonEmpty>
      ),
    },
  },
  [BackgroundSessionViewState.BackgroundLoading]: {
    button: {
      iconType: EuiLoadingSpinner,
      'aria-label': 'Loading results in the background',
      tooltipText: 'Loading results in the background',
    },
    popover: {
      text: 'Loading in the background',
      primaryAction: ({ onStopLoading = () => {}, buttonProps = {} }) => (
        <EuiButtonEmpty onClick={onStopLoading} {...buttonProps}>
          Cancel
        </EuiButtonEmpty>
      ),
      secondaryAction: ({ onViewBackgroundRequests = () => {}, buttonProps = {} }) => (
        <EuiButtonEmpty onClick={onViewBackgroundRequests} {...buttonProps}>
          View background sessions
        </EuiButtonEmpty>
      ),
    },
  },
  [BackgroundSessionViewState.BackgroundCompleted]: {
    button: {
      color: 'success',
      iconType: 'checkInCircleFilled',
      'aria-label': 'Results loaded in the background',
      tooltipText: 'Results loaded in the background',
    },
    popover: {
      text: 'Results loaded',
      primaryAction: ({ onViewBackgroundRequests = () => {}, buttonProps = {} }) => (
        <EuiButtonEmpty onClick={onViewBackgroundRequests} {...buttonProps}>
          View background sessions
        </EuiButtonEmpty>
      ),
    },
  },
  [BackgroundSessionViewState.Restored]: {
    button: {
      color: 'warning',
      iconType: 'refresh',
      'aria-label': 'Restored older results. The data is not current.',
      tooltipText: 'Restored older results. The data is not current.',
    },
    popover: {
      text: 'Results no longer current',
      primaryAction: ({ onReload = () => {}, buttonProps = {} }) => (
        <EuiButtonEmpty onClick={onReload} {...buttonProps}>
          Refresh
        </EuiButtonEmpty>
      ),
      secondaryAction: ({ onViewBackgroundRequests = () => {}, buttonProps = {} }) => (
        <EuiButtonEmpty onClick={onViewBackgroundRequests} {...buttonProps}>
          View background sessions
        </EuiButtonEmpty>
      ),
    },
  },
};

export const BackgroundSessionIndicator: React.FC<BackgroundSessionIndicatorProps> = (props) => {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const onButtonClick = () => setIsPopoverOpen((isOpen) => !isOpen);
  const closePopover = () => setIsPopoverOpen(false);

  const { button, popover } = backgroundSessionIndicatorViewStateToProps[props.state];

  return (
    <EuiPopover
      ownFocus
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition={'leftCenter'}
      panelPaddingSize={'s'}
      button={
        <EuiToolTip content={button.tooltipText}>
          <EuiButtonIcon
            color={button.color}
            aria-label={button['aria-label']}
            iconType={button.iconType}
            onClick={onButtonClick}
          />
        </EuiToolTip>
      }
    >
      <EuiFlexGroup responsive={false} alignItems={'center'} gutterSize={'s'}>
        <EuiFlexItem grow={true}>
          <EuiFlexGroup responsive={false} alignItems={'center'} gutterSize={'xs'}>
            <EuiFlexItem grow={true}>
              <EuiText size="s" color={'subdued'}>
                <p>{popover.text}</p>
              </EuiText>
            </EuiFlexItem>
            {popover.primaryAction && (
              <EuiFlexItem grow={false}>
                <popover.primaryAction {...props} buttonProps={{ size: 'xs' }} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        {popover.secondaryAction && (
          <EuiFlexItem grow={false} style={{ borderLeft: '1px solid #D3DAE6' }}>
            <popover.secondaryAction
              {...props}
              buttonProps={{ size: 'xs', style: { marginLeft: 8 } }}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPopover>
  );
};

// React.lazy() needs default:
// eslint-disable-next-line import/no-default-export
export default BackgroundSessionIndicator;
