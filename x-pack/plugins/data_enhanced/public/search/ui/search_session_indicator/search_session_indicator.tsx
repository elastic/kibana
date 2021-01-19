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

import './search_session_indicator.scss';
import { SearchSessionState } from '../../../../../../../src/plugins/data/public';

export interface SearchSessionIndicatorProps {
  state: SearchSessionState;
  onContinueInBackground?: () => void;
  onCancel?: () => void;
  viewSearchSessionsLink?: string;
  onSaveResults?: () => void;
  onRefresh?: () => void;
  disabled?: boolean;
  disabledReasonText?: string;
}

type ActionButtonProps = SearchSessionIndicatorProps & { buttonProps: EuiButtonEmptyProps };

const CancelButton = ({ onCancel = () => {}, buttonProps = {} }: ActionButtonProps) => (
  <EuiButtonEmpty
    onClick={onCancel}
    data-test-subj={'searchSessionIndicatorCancelBtn'}
    {...buttonProps}
  >
    <FormattedMessage
      id="xpack.data.searchSessionIndicator.cancelButtonText"
      defaultMessage="Cancel session"
    />
  </EuiButtonEmpty>
);

const ContinueInBackgroundButton = ({
  onContinueInBackground = () => {},
  buttonProps = {},
}: ActionButtonProps) => (
  <EuiButtonEmpty
    onClick={onContinueInBackground}
    data-test-subj={'searchSessionIndicatorContinueInBackgroundBtn'}
    {...buttonProps}
  >
    <FormattedMessage
      id="xpack.data.searchSessionIndicator.continueInBackgroundButtonText"
      defaultMessage="Continue in background"
    />
  </EuiButtonEmpty>
);

const ViewAllSearchSessionsButton = ({
  viewSearchSessionsLink = 'management',
  buttonProps = {},
}: ActionButtonProps) => (
  <EuiButtonEmpty
    href={viewSearchSessionsLink}
    data-test-subj={'searchSessionIndicatorviewSearchSessionsLink'}
    {...buttonProps}
  >
    <FormattedMessage
      id="xpack.data.searchSessionIndicator.viewSearchSessionsLinkText"
      defaultMessage="View all sessions"
    />
  </EuiButtonEmpty>
);

const RefreshButton = ({ onRefresh = () => {}, buttonProps = {} }: ActionButtonProps) => (
  <EuiButtonEmpty
    onClick={onRefresh}
    data-test-subj={'searchSessionIndicatorRefreshBtn'}
    {...buttonProps}
  >
    <FormattedMessage
      id="xpack.data.searchSessionIndicator.refreshButtonText"
      defaultMessage="Refresh"
    />
  </EuiButtonEmpty>
);

const SaveButton = ({ onSaveResults = () => {}, buttonProps = {} }: ActionButtonProps) => (
  <EuiButtonEmpty
    onClick={onSaveResults}
    data-test-subj={'searchSessionIndicatorSaveBtn'}
    {...buttonProps}
  >
    <FormattedMessage
      id="xpack.data.searchSessionIndicator.saveButtonText"
      defaultMessage="Save session"
    />
  </EuiButtonEmpty>
);

const searchSessionIndicatorViewStateToProps: {
  [state in SearchSessionState]: {
    button: Pick<EuiButtonIconProps, 'color' | 'iconType' | 'aria-label'> & {
      tooltipText: string;
    };
    popover: {
      text: string;
      primaryAction?: React.ComponentType<ActionButtonProps>;
      secondaryAction?: React.ComponentType<ActionButtonProps>;
    };
  } | null;
} = {
  [SearchSessionState.None]: null,
  [SearchSessionState.Loading]: {
    button: {
      color: 'subdued',
      iconType: 'clock',
      'aria-label': i18n.translate(
        'xpack.data.searchSessionIndicator.loadingResultsIconAriaLabel',
        { defaultMessage: 'Loading' }
      ),
      tooltipText: i18n.translate(
        'xpack.data.searchSessionIndicator.loadingResultsIconTooltipText',
        { defaultMessage: 'Loading' }
      ),
    },
    popover: {
      text: i18n.translate('xpack.data.searchSessionIndicator.loadingResultsText', {
        defaultMessage: 'Loading',
      }),
      primaryAction: CancelButton,
      secondaryAction: ContinueInBackgroundButton,
    },
  },
  [SearchSessionState.Completed]: {
    button: {
      color: 'subdued',
      iconType: 'checkInCircleFilled',
      'aria-label': i18n.translate('xpack.data.searchSessionIndicator.resultsLoadedIconAriaLabel', {
        defaultMessage: 'Loaded',
      }),
      tooltipText: i18n.translate(
        'xpack.data.searchSessionIndicator.resultsLoadedIconTooltipText',
        {
          defaultMessage: 'Results loaded',
        }
      ),
    },
    popover: {
      text: i18n.translate('xpack.data.searchSessionIndicator.resultsLoadedText', {
        defaultMessage: 'Loaded',
      }),
      primaryAction: SaveButton,
      secondaryAction: ViewAllSearchSessionsButton,
    },
  },
  [SearchSessionState.BackgroundLoading]: {
    button: {
      iconType: EuiLoadingSpinner,
      'aria-label': i18n.translate(
        'xpack.data.searchSessionIndicator.loadingInTheBackgroundIconAriaLabel',
        {
          defaultMessage: 'Loading results in the background',
        }
      ),
      tooltipText: i18n.translate(
        'xpack.data.searchSessionIndicator.loadingInTheBackgroundIconTooltipText',
        {
          defaultMessage: 'Loading results in the background',
        }
      ),
    },
    popover: {
      text: i18n.translate('xpack.data.searchSessionIndicator.loadingInTheBackgroundText', {
        defaultMessage: 'Loading in the background',
      }),
      primaryAction: CancelButton,
      secondaryAction: ViewAllSearchSessionsButton,
    },
  },
  [SearchSessionState.BackgroundCompleted]: {
    button: {
      color: 'success',
      iconType: 'checkInCircleFilled',
      'aria-label': i18n.translate(
        'xpack.data.searchSessionIndicator.resultLoadedInTheBackgroundIconAraText',
        {
          defaultMessage: 'Results loaded in the background',
        }
      ),
      tooltipText: i18n.translate(
        'xpack.data.searchSessionIndicator.resultLoadedInTheBackgroundIconTooltipText',
        {
          defaultMessage: 'Results loaded in the background',
        }
      ),
    },
    popover: {
      text: i18n.translate('xpack.data.searchSessionIndicator.resultLoadedInTheBackgroundText', {
        defaultMessage: 'Loaded',
      }),
      primaryAction: ViewAllSearchSessionsButton,
    },
  },
  [SearchSessionState.Restored]: {
    button: {
      color: 'warning',
      iconType: 'refresh',
      'aria-label': i18n.translate(
        'xpack.data.searchSessionIndicator.restoredResultsIconAriaLabel',
        {
          defaultMessage: 'Results no longer current',
        }
      ),
      tooltipText: i18n.translate('xpack.data.searchSessionIndicator.restoredResultsTooltipText', {
        defaultMessage: 'Results no longer current',
      }),
    },
    popover: {
      text: i18n.translate('xpack.data.searchSessionIndicator.restoredText', {
        defaultMessage: 'Results no longer current',
      }),
      primaryAction: RefreshButton,
      secondaryAction: ViewAllSearchSessionsButton,
    },
  },
  [SearchSessionState.Canceled]: {
    button: {
      color: 'subdued',
      iconType: 'refresh',
      'aria-label': i18n.translate('xpack.data.searchSessionIndicator.canceledIconAriaLabel', {
        defaultMessage: 'Canceled',
      }),
      tooltipText: i18n.translate('xpack.data.searchSessionIndicator.canceledTooltipText', {
        defaultMessage: 'Search was canceled',
      }),
    },
    popover: {
      text: i18n.translate('xpack.data.searchSessionIndicator.canceledText', {
        defaultMessage: 'Search was canceled',
      }),
      primaryAction: RefreshButton,
      secondaryAction: ViewAllSearchSessionsButton,
    },
  },
};

const VerticalDivider: React.FC = () => <div className="searchSessionIndicator__verticalDivider" />;

export const SearchSessionIndicator: React.FC<SearchSessionIndicatorProps> = (props) => {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const onButtonClick = () => setIsPopoverOpen((isOpen) => !isOpen);
  const closePopover = () => setIsPopoverOpen(false);

  if (!searchSessionIndicatorViewStateToProps[props.state]) return null;

  const { button, popover } = searchSessionIndicatorViewStateToProps[props.state]!;

  return (
    <EuiPopover
      ownFocus
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition={'rightCenter'}
      panelPaddingSize={'s'}
      className="searchSessionIndicator"
      data-test-subj={'searchSessionIndicator'}
      data-state={props.state}
      button={
        <EuiToolTip content={props.disabled ? props.disabledReasonText : button.tooltipText}>
          <EuiButtonIcon
            color={button.color}
            aria-label={button['aria-label']}
            iconType={button.iconType}
            onClick={onButtonClick}
            disabled={props.disabled}
          />
        </EuiToolTip>
      }
    >
      <EuiFlexGroup
        responsive={true}
        alignItems={'center'}
        gutterSize={'s'}
        className="searchSessionIndicator__popoverContainer"
        data-test-subj={'searchSessionIndicatorPopoverContainer'}
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
export default SearchSessionIndicator;
