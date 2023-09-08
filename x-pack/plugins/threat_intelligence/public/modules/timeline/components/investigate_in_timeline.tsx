/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { EuiButtonIcon, EuiContextMenuItem, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useInvestigateInTimeline } from '../hooks/use_investigate_in_timeline';
import { Indicator } from '../../../../common/types/indicator';
import { BUTTON_ICON_LABEL } from './translations';

export interface InvestigateInTimelineProps {
  /**
   * Value passed to the timeline. Used in combination with field if is type of {@link Indicator}.
   */
  data: Indicator;
  /**
   * Click event to close the popover in the parent component
   */
  onClick?: () => void;
  /**
   * Used for unit and e2e tests.
   */
  ['data-test-subj']?: string;
}

/**
 * Investigate in timeline button, uses the InvestigateInTimelineAction component (x-pack/plugins/security_solution/public/detections/components/alerts_table/timeline_actions/investigate_in_timeline_action.tsx)
 * retrieved from the SecuritySolutionContext.
 *
 * This component renders an {@link EuiContextMenu}.
 *
 * @returns investigate in timeline for a context menu
 */
export const InvestigateInTimelineContextMenu: VFC<InvestigateInTimelineProps> = ({
  data,
  onClick,
  'data-test-subj': dataTestSub,
}) => {
  const { investigateInTimelineFn } = useInvestigateInTimeline({ indicator: data });
  if (!investigateInTimelineFn) {
    return null;
  }

  const menuItemClicked = () => {
    if (onClick) onClick();
    investigateInTimelineFn();
  };

  return (
    <EuiContextMenuItem
      key="investigateInTime"
      onClick={() => menuItemClicked()}
      data-test-subj={dataTestSub}
    >
      <FormattedMessage
        defaultMessage="Investigate in Timeline"
        id="xpack.threatIntelligence.investigateInTimelineButton"
      />
    </EuiContextMenuItem>
  );
};

/**
 * Investigate in timeline button uses the InvestigateInTimelineAction component (x-pack/plugins/security_solution/public/detections/components/alerts_table/timeline_actions/investigate_in_timeline_action.tsx)
 * retrieved from the SecuritySolutionContext.
 *
 * This component renders an {@link EuiButtonIcon}.
 *
 * @returns add to timeline button icon
 */
export const InvestigateInTimelineButtonIcon: VFC<InvestigateInTimelineProps> = ({
  data,
  'data-test-subj': dataTestSub,
}) => {
  const { investigateInTimelineFn } = useInvestigateInTimeline({ indicator: data });
  if (!investigateInTimelineFn) {
    return null;
  }

  return (
    <EuiToolTip content={BUTTON_ICON_LABEL}>
      <EuiButtonIcon
        aria-label={BUTTON_ICON_LABEL}
        iconType="timeline"
        iconSize="s"
        size="xs"
        color="primary"
        onClick={investigateInTimelineFn}
        data-test-subj={dataTestSub}
      />
    </EuiToolTip>
  );
};
