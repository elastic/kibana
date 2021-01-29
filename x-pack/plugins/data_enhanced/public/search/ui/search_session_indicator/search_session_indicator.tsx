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
  EuiSpacer,
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
    color="danger"
    {...buttonProps}
  >
    <FormattedMessage
      id="xpack.data.searchSessionIndicator.cancelButtonText"
      defaultMessage="Stop session"
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
      defaultMessage="Save session"
    />
  </EuiButtonEmpty>
);

const ViewAllSearchSessionsButton = ({
  viewSearchSessionsLink = 'management/kibana/search_sessions',
  buttonProps = {},
}: ActionButtonProps) => (
  <EuiButtonEmpty
    href={viewSearchSessionsLink}
    data-test-subj={'searchSessionIndicatorviewSearchSessionsLink'}
    {...buttonProps}
  >
    <FormattedMessage
      id="xpack.data.searchSessionIndicator.viewSearchSessionsLinkText"
      defaultMessage="Manage sessions"
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
      defaultMessage="Re-run session"
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
      title: string;
      description: string;
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
      title: i18n.translate('xpack.data.searchSessionIndicator.loadingResultsTitle', {
        defaultMessage: 'Your search is taking a while...',
      }),
      description: i18n.translate('xpack.data.searchSessionIndicator.loadingResultsDescription', {
        defaultMessage: 'Save your session to get back to the results later',
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
        defaultMessage: 'Search session complete',
      }),
      tooltipText: i18n.translate(
        'xpack.data.searchSessionIndicator.resultsLoadedIconTooltipText',
        {
          defaultMessage: 'Search session complete',
        }
      ),
    },
    popover: {
      title: i18n.translate('xpack.data.searchSessionIndicator.resultsLoadedText', {
        defaultMessage: 'Search session complete',
      }),
      description: i18n.translate(
        'xpack.data.searchSessionIndicator.resultsLoadedDescriptionText',
        {
          defaultMessage: 'Save your session to get back to the results later',
        }
      ),
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
          defaultMessage: 'Search session saved and loading in the background',
        }
      ),
      tooltipText: i18n.translate(
        'xpack.data.searchSessionIndicator.loadingInTheBackgroundIconTooltipText',
        {
          defaultMessage: 'Search session saved and loading in the background',
        }
      ),
    },
    popover: {
      title: i18n.translate('xpack.data.searchSessionIndicator.loadingInTheBackgroundTitleText', {
        defaultMessage: 'Loading in the background',
      }),
      description: i18n.translate(
        'xpack.data.searchSessionIndicator.loadingInTheBackgroundDescriptionText',
        {
          defaultMessage:
            'Search session saved and loading in the background. You can leave the page and get back to the results later.',
        }
      ),
      primaryAction: CancelButton,
      secondaryAction: ViewAllSearchSessionsButton,
    },
  },
  [SearchSessionState.BackgroundCompleted]: {
    button: {
      color: 'success',
      iconType: 'checkInCircleFilled',
      'aria-label': i18n.translate(
        'xpack.data.searchSessionIndicator.resultLoadedInTheBackgroundIconAriaLabel',
        {
          defaultMessage: 'Search session complete',
        }
      ),
      tooltipText: i18n.translate(
        'xpack.data.searchSessionIndicator.resultLoadedInTheBackgroundIconTooltipText',
        {
          defaultMessage: 'Search session complete',
        }
      ),
    },
    popover: {
      title: i18n.translate(
        'xpack.data.searchSessionIndicator.resultLoadedInTheBackgroundTitleText',
        {
          defaultMessage: 'Search session complete',
        }
      ),
      description: i18n.translate(
        'xpack.data.searchSessionIndicator.resultLoadedInTheBackgroundDescriptionText',
        {
          defaultMessage: 'You can leave and get back to the results later.',
        }
      ),
      primaryAction: RefreshButton,
      secondaryAction: ViewAllSearchSessionsButton,
    },
  },
  [SearchSessionState.Restored]: {
    button: {
      color: 'warning',
      iconType: 'refresh',
      'aria-label': i18n.translate(
        'xpack.data.searchSessionIndicator.restoredResultsIconAriaLabel',
        {
          defaultMessage: 'Search session restored',
        }
      ),
      tooltipText: i18n.translate('xpack.data.searchSessionIndicator.restoredResultsTooltipText', {
        defaultMessage: 'Search session restored',
      }),
    },
    popover: {
      title: i18n.translate('xpack.data.searchSessionIndicator.restoredTitleText', {
        defaultMessage: 'Search session restored',
      }),
      description: i18n.translate('xpack.data.searchSessionIndicator.restoredDescriptionText', {
        defaultMessage:
          'You are viewing cached data from the specific time range. Changing the time range or filter will re-run the session.',
      }),
      primaryAction: RefreshButton,
      secondaryAction: ViewAllSearchSessionsButton,
    },
  },
  [SearchSessionState.Canceled]: {
    button: {
      color: 'danger',
      iconType: 'alert',
      'aria-label': i18n.translate('xpack.data.searchSessionIndicator.canceledIconAriaLabel', {
        defaultMessage: 'Search session canceled',
      }),
      tooltipText: i18n.translate('xpack.data.searchSessionIndicator.canceledTooltipText', {
        defaultMessage: 'Search session canceled',
      }),
    },
    popover: {
      title: i18n.translate('xpack.data.searchSessionIndicator.canceledTitleText', {
        defaultMessage: 'Search session canceled',
      }),
      description: i18n.translate('xpack.data.searchSessionIndicator.canceledDescriptionText', {
        defaultMessage: 'Canceled by user',
      }),
      primaryAction: RefreshButton,
      secondaryAction: ViewAllSearchSessionsButton,
    },
  },
};

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
      anchorPosition={'downLeft'}
      panelPaddingSize={'m'}
      className="searchSessionIndicator"
      data-test-subj={'searchSessionIndicator'}
      data-state={props.state}
      panelClassName={'searchSessionIndicator__panel'}
      button={
        <EuiToolTip
          content={props.disabled ? props.disabledReasonText : button.tooltipText}
          delay={props.disabled ? 'regular' : 'long'}
        >
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
      <EuiText size="s">
        <p>{popover.title}</p>
      </EuiText>
      <EuiSpacer size={'xs'} />
      <EuiText size="xs" color={'subdued'}>
        <p>{popover.description}</p>
      </EuiText>
      <EuiSpacer size={'s'} />
      <EuiFlexGroup
        wrap={true}
        responsive={false}
        alignItems={'center'}
        justifyContent={'flexEnd'}
        gutterSize={'s'}
      >
        {popover.primaryAction && (
          <EuiFlexItem grow={false}>
            <popover.primaryAction {...props} buttonProps={{ size: 'xs' }} />
          </EuiFlexItem>
        )}
        {popover.secondaryAction && (
          <EuiFlexItem grow={false}>
            <popover.secondaryAction {...props} buttonProps={{ size: 'xs', flush: 'right' }} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPopover>
  );
};

// React.lazy() needs default:
// eslint-disable-next-line import/no-default-export
export default SearchSessionIndicator;
