/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useImperativeHandle } from 'react';
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
import { PartialClock, CheckInEmptyCircle } from './custom_icons';
import './search_session_indicator.scss';
import { SearchSessionState } from '../../../../../../../src/plugins/data/public';

export interface SearchSessionIndicatorProps {
  state: SearchSessionState;
  onContinueInBackground?: () => void;
  onCancel?: () => void;
  viewSearchSessionsLink?: string;
  onSaveResults?: () => void;
  disabled?: boolean;
  disabledReasonText?: string;
  onOpened?: (openedState: SearchSessionState) => void;
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
    data-test-subj={'searchSessionIndicatorViewSearchSessionsLink'}
    {...buttonProps}
  >
    <FormattedMessage
      id="xpack.data.searchSessionIndicator.viewSearchSessionsLinkText"
      defaultMessage="Manage sessions"
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
      iconType: PartialClock,
      'aria-label': i18n.translate(
        'xpack.data.searchSessionIndicator.loadingResultsIconAriaLabel',
        { defaultMessage: 'Search session loading' }
      ),
      tooltipText: i18n.translate(
        'xpack.data.searchSessionIndicator.loadingResultsIconTooltipText',
        { defaultMessage: 'Search session loading' }
      ),
    },
    popover: {
      title: i18n.translate('xpack.data.searchSessionIndicator.loadingResultsTitle', {
        defaultMessage: 'Your search is taking a while...',
      }),
      description: i18n.translate('xpack.data.searchSessionIndicator.loadingResultsDescription', {
        defaultMessage: 'Save your session, continue your work, and return to completed results.',
      }),
      primaryAction: CancelButton,
      secondaryAction: ContinueInBackgroundButton,
    },
  },
  [SearchSessionState.Completed]: {
    button: {
      color: 'subdued',
      iconType: 'clock',
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
          defaultMessage: 'Save your session and return to it later.',
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
          defaultMessage: 'Saved session in progress',
        }
      ),
      tooltipText: i18n.translate(
        'xpack.data.searchSessionIndicator.loadingInTheBackgroundIconTooltipText',
        {
          defaultMessage: 'Saved session in progress',
        }
      ),
    },
    popover: {
      title: i18n.translate('xpack.data.searchSessionIndicator.loadingInTheBackgroundTitleText', {
        defaultMessage: 'Saved session in progress',
      }),
      description: i18n.translate(
        'xpack.data.searchSessionIndicator.loadingInTheBackgroundDescriptionText',
        {
          defaultMessage: 'You can return to completed results from Management.',
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
          defaultMessage: 'Saved session complete',
        }
      ),
      tooltipText: i18n.translate(
        'xpack.data.searchSessionIndicator.resultLoadedInTheBackgroundIconTooltipText',
        {
          defaultMessage: 'Saved session complete',
        }
      ),
    },
    popover: {
      title: i18n.translate(
        'xpack.data.searchSessionIndicator.resultLoadedInTheBackgroundTitleText',
        {
          defaultMessage: 'Search session saved',
        }
      ),
      description: i18n.translate(
        'xpack.data.searchSessionIndicator.resultLoadedInTheBackgroundDescriptionText',
        {
          defaultMessage: 'You can return to these results from Management.',
        }
      ),
      secondaryAction: ViewAllSearchSessionsButton,
    },
  },
  [SearchSessionState.Restored]: {
    button: {
      color: 'success',
      iconType: CheckInEmptyCircle,
      'aria-label': i18n.translate(
        'xpack.data.searchSessionIndicator.restoredResultsIconAriaLabel',
        {
          defaultMessage: 'Saved session restored',
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
          'You are viewing cached data from a specific time range. Changing the time range or filters will re-run the session.',
      }),
      secondaryAction: ViewAllSearchSessionsButton,
    },
  },
  [SearchSessionState.Canceled]: {
    button: {
      color: 'danger',
      iconType: 'alert',
      'aria-label': i18n.translate('xpack.data.searchSessionIndicator.canceledIconAriaLabel', {
        defaultMessage: 'Search session stopped',
      }),
      tooltipText: i18n.translate('xpack.data.searchSessionIndicator.canceledTooltipText', {
        defaultMessage: 'Search session stopped',
      }),
    },
    popover: {
      title: i18n.translate('xpack.data.searchSessionIndicator.canceledTitleText', {
        defaultMessage: 'Search session stopped',
      }),
      description: i18n.translate('xpack.data.searchSessionIndicator.canceledDescriptionText', {
        defaultMessage: 'You are viewing incomplete data.',
      }),
      secondaryAction: ViewAllSearchSessionsButton,
    },
  },
};

export interface SearchSessionIndicatorRef {
  openPopover: () => void;
  closePopover: () => void;
}

export const SearchSessionIndicator = React.forwardRef<
  SearchSessionIndicatorRef,
  SearchSessionIndicatorProps
>((props, ref) => {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const onOpened = props.onOpened;
  const openPopover = useCallback(() => {
    setIsPopoverOpen(true);
    if (onOpened) onOpened(props.state);
  }, [onOpened, props.state]);
  const onButtonClick = useCallback(() => {
    if (isPopoverOpen) {
      closePopover();
    } else {
      openPopover();
    }
  }, [isPopoverOpen, openPopover, closePopover]);

  useImperativeHandle(
    ref,
    () => ({
      openPopover: () => {
        openPopover();
      },
      closePopover: () => {
        closePopover();
      },
    }),
    [openPopover, closePopover]
  );

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
      repositionOnScroll={true}
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
      <div data-test-subj="searchSessionIndicatorPopoverContainer">
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
      </div>
    </EuiPopover>
  );
});

// React.lazy() needs default:
// eslint-disable-next-line import/no-default-export
export default SearchSessionIndicator;
