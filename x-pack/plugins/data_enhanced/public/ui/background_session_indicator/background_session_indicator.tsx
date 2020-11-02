/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiButtonEmpty,
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
      buttons: Array<React.ComponentType<BackgroundSessionIndicatorProps>>;
    };
  };
} = {
  [BackgroundSessionViewState.Loading]: {
    button: {
      color: 'subdued',
      iconType: 'clock',
      'aria-label': 'Loading results...',
      tooltipText: 'Loading results',
    },
    popover: {
      text: 'Loading',
      buttons: [
        ({ onStopLoading = () => {} }) => (
          <EuiButtonEmpty size="xs" onClick={onStopLoading} iconType={'cross'} flush={'both'}>
            Cancel
          </EuiButtonEmpty>
        ),
        ({ onContinueInBackground = () => {} }) => (
          <EuiButtonEmpty size="xs" onClick={onContinueInBackground} flush={'both'}>
            Continue in background
          </EuiButtonEmpty>
        ),
      ],
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
      buttons: [
        ({ onSaveResults = () => {} }) => (
          <EuiButtonEmpty size="xs" onClick={onSaveResults} flush={'both'}>
            Save results
          </EuiButtonEmpty>
        ),
        ({ onViewBackgroundRequests = () => {} }) => (
          // TODO: make this a link
          <EuiButtonEmpty size="xs" onClick={onViewBackgroundRequests} flush={'both'}>
            View requests
          </EuiButtonEmpty>
        ),
      ],
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
      buttons: [
        ({ onStopLoading = () => {} }) => (
          <EuiButtonEmpty size="xs" onClick={onStopLoading} iconType={'cross'} flush={'both'}>
            Cancel
          </EuiButtonEmpty>
        ),
        ({ onViewBackgroundRequests = () => {} }) => (
          <EuiButtonEmpty size="xs" onClick={onViewBackgroundRequests} flush={'both'}>
            View requests
          </EuiButtonEmpty>
        ),
      ],
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
      text: 'Loaded in the background',
      buttons: [
        ({ onViewBackgroundRequests = () => {} }) => (
          <EuiButtonEmpty size="xs" onClick={onViewBackgroundRequests} flush={'both'}>
            View background requests
          </EuiButtonEmpty>
        ),
      ],
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
      text: 'The data is not current',
      buttons: [
        ({ onReload = () => {} }) => (
          <EuiButtonEmpty size="xs" onClick={onReload} iconType={'refresh'} flush={'both'}>
            Reload
          </EuiButtonEmpty>
        ),
      ],
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
        <EuiFlexItem grow={true} style={{ marginRight: '12px' }}>
          <EuiText size="s" color={'subdued'}>
            <p>{popover.text}</p>
          </EuiText>
        </EuiFlexItem>
        {popover.buttons.map((Button, index) => (
          <EuiFlexItem key={props.state + index} grow={false}>
            <Button {...props} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPopover>
  );
};

// React.lazy() needs default:
// eslint-disable-next-line import/no-default-export
export default BackgroundSessionIndicator;
