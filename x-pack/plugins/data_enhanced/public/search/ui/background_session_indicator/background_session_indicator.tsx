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
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { BackgroundSessionViewState } from '../connected_background_session_indicator';
import './background_session_indicator.scss';

export interface BackgroundSessionIndicatorProps {
  state: BackgroundSessionViewState;
  onContinueInBackground?: () => void;
  onCancel?: () => void;
  onViewBackgroundSessions?: () => void;
  onSaveResults?: () => void;
  onRefresh?: () => void;
}

type ActionButtonProps = BackgroundSessionIndicatorProps & { buttonProps: EuiButtonEmptyProps };

const CancelButton = ({ onCancel = () => {}, buttonProps = {} }: ActionButtonProps) => (
  <EuiButtonEmpty onClick={onCancel} {...buttonProps}>
    <FormattedMessage
      id="xpack.data.backgroundSessionIndicator.cancelButtonText"
      defaultMessage="Cancel"
    />
  </EuiButtonEmpty>
);

const ContinueInBackgroundButton = ({
  onContinueInBackground = () => {},
  buttonProps = {},
}: ActionButtonProps) => (
  <EuiButtonEmpty onClick={onContinueInBackground} {...buttonProps}>
    <FormattedMessage
      id="xpack.data.backgroundSessionIndicator.continueInBackgroundButtonText"
      defaultMessage="Continue in background"
    />
  </EuiButtonEmpty>
);

const ViewBackgroundSessionsButton = ({
  onViewBackgroundSessions = () => {},
  buttonProps = {},
}: ActionButtonProps) => (
  // TODO: make this a link
  <EuiButtonEmpty onClick={onViewBackgroundSessions} {...buttonProps}>
    <FormattedMessage
      id="xpack.data.backgroundSessionIndicator.viewBackgroundSessionsLinkText"
      defaultMessage="View background sessions"
    />
  </EuiButtonEmpty>
);

const RefreshButton = ({ onRefresh = () => {}, buttonProps = {} }: ActionButtonProps) => (
  <EuiButtonEmpty onClick={onRefresh} {...buttonProps}>
    <FormattedMessage
      id="xpack.data.backgroundSessionIndicator.refreshButtonText"
      defaultMessage="Refresh"
    />
  </EuiButtonEmpty>
);

const SaveButton = ({ onSaveResults = () => {}, buttonProps = {} }: ActionButtonProps) => (
  <EuiButtonEmpty onClick={onSaveResults} {...buttonProps}>
    <FormattedMessage
      id="xpack.data.backgroundSessionIndicator.saveButtonText"
      defaultMessage="Save"
    />
  </EuiButtonEmpty>
);

const backgroundSessionIndicatorViewStateToProps: {
  [state in BackgroundSessionViewState]: {
    button: Pick<EuiButtonIconProps, 'color' | 'iconType' | 'aria-label'> & { tooltipText: string };
    popover: {
      text: string;
      primaryAction?: React.ComponentType<ActionButtonProps>;
      secondaryAction?: React.ComponentType<ActionButtonProps>;
    };
  };
} = {
  [BackgroundSessionViewState.Loading]: {
    button: {
      color: 'subdued',
      iconType: 'clock',
      'aria-label': i18n.translate(
        'xpack.data.backgroundSessionIndicator.loadingResultsIconAriaLabel',
        { defaultMessage: 'Loading results' }
      ),
      tooltipText: i18n.translate(
        'xpack.data.backgroundSessionIndicator.loadingResultsIconTooltipText',
        { defaultMessage: 'Loading results' }
      ),
    },
    popover: {
      text: i18n.translate('xpack.data.backgroundSessionIndicator.loadingResultsText', {
        defaultMessage: 'Loading',
      }),
      primaryAction: CancelButton,
      secondaryAction: ContinueInBackgroundButton,
    },
  },
  [BackgroundSessionViewState.Completed]: {
    button: {
      color: 'subdued',
      iconType: 'checkInCircleFilled',
      'aria-label': i18n.translate(
        'xpack.data.backgroundSessionIndicator.resultsLoadedIconAriaLabel',
        {
          defaultMessage: 'Results loaded',
        }
      ),
      tooltipText: i18n.translate(
        'xpack.data.backgroundSessionIndicator.resultsLoadedIconTooltipText',
        {
          defaultMessage: 'Results loaded',
        }
      ),
    },
    popover: {
      text: i18n.translate('xpack.data.backgroundSessionIndicator.resultsLoadedText', {
        defaultMessage: 'Results loaded',
      }),
      primaryAction: SaveButton,
      secondaryAction: ViewBackgroundSessionsButton,
    },
  },
  [BackgroundSessionViewState.BackgroundLoading]: {
    button: {
      iconType: EuiLoadingSpinner,
      'aria-label': i18n.translate(
        'xpack.data.backgroundSessionIndicator.loadingInTheBackgroundIconAriaLabel',
        {
          defaultMessage: 'Loading results in the background',
        }
      ),
      tooltipText: i18n.translate(
        'xpack.data.backgroundSessionIndicator.loadingInTheBackgroundIconTooltipText',
        {
          defaultMessage: 'Loading results in the background',
        }
      ),
    },
    popover: {
      text: i18n.translate('xpack.data.backgroundSessionIndicator.loadingInTheBackgroundText', {
        defaultMessage: 'Loading in the background',
      }),
      primaryAction: CancelButton,
      secondaryAction: ViewBackgroundSessionsButton,
    },
  },
  [BackgroundSessionViewState.BackgroundCompleted]: {
    button: {
      color: 'success',
      iconType: 'checkInCircleFilled',
      'aria-label': i18n.translate(
        'xpack.data.backgroundSessionIndicator.resultLoadedInTheBackgroundIconAraText',
        {
          defaultMessage: 'Results loaded in the background',
        }
      ),
      tooltipText: i18n.translate(
        'xpack.data.backgroundSessionIndicator.resultLoadedInTheBackgroundIconTooltipText',
        {
          defaultMessage: 'Results loaded in the background',
        }
      ),
    },
    popover: {
      text: i18n.translate(
        'xpack.data.backgroundSessionIndicator.resultLoadedInTheBackgroundText',
        {
          defaultMessage: 'Results loaded',
        }
      ),
      primaryAction: ViewBackgroundSessionsButton,
    },
  },
  [BackgroundSessionViewState.Restored]: {
    button: {
      color: 'warning',
      iconType: 'refresh',
      'aria-label': i18n.translate(
        'xpack.data.backgroundSessionIndicator.restoredResultsIconAriaLabel',
        {
          defaultMessage: 'Results no longer current',
        }
      ),
      tooltipText: i18n.translate(
        'xpack.data.backgroundSessionIndicator.restoredResultsTooltipText',
        {
          defaultMessage: 'Results no longer current',
        }
      ),
    },
    popover: {
      text: i18n.translate('xpack.data.backgroundSessionIndicator.restoredText', {
        defaultMessage: 'Results no longer current',
      }),
      primaryAction: RefreshButton,
      secondaryAction: ViewBackgroundSessionsButton,
    },
  },
};

const VerticalDivider: React.FC = () => (
  <div className="backgroundSessionIndicator__verticalDivider" />
);

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
      anchorPosition={'rightCenter'}
      panelPaddingSize={'s'}
      className="backgroundSessionIndicator"
      data-test-subj={'backgroundSessionIndicator'}
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
      <EuiFlexGroup
        responsive={true}
        alignItems={'center'}
        gutterSize={'s'}
        className="backgroundSessionIndicator__popoverContainer"
      >
        <EuiFlexItem grow={true}>
          <EuiText size="s" color={'subdued'}>
            <p>{popover.text}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup wrap={true} responsive={false} alignItems={'center'} gutterSize={'s'}>
            {popover.primaryAction && (
              <EuiFlexItem grow={false}>
                <popover.primaryAction {...props} buttonProps={{ size: 'xs', flush: 'both' }} />
              </EuiFlexItem>
            )}
            {popover.primaryAction && popover.secondaryAction && <VerticalDivider />}
            {popover.secondaryAction && (
              <EuiFlexItem grow={false}>
                <popover.secondaryAction {...props} buttonProps={{ size: 'xs', flush: 'both' }} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};

// React.lazy() needs default:
// eslint-disable-next-line import/no-default-export
export default BackgroundSessionIndicator;
