/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { EuiButton, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useInvestigateInTimeline } from '../../hooks';
import { Indicator } from '../../../indicators';

const BUTTON_ICON_LABEL: string = i18n.translate(
  'xpack.threatIntelligence.timeline.investigateInTimelineButtonIcon',
  {
    defaultMessage: 'Investigate in Timeline',
  }
);

export interface InvestigateInTimelineButtonProps {
  /**
   * Value passed to the timeline. Used in combination with field if is type of {@link Indicator}.
   */
  data: Indicator;
  /**
   * Used for unit and e2e tests.
   */
  ['data-test-subj']?: string;
}

/**
 * Investigate in timeline button, uses the InvestigateInTimelineAction component (x-pack/plugins/security_solution/public/detections/components/alerts_table/timeline_actions/investigate_in_timeline_action.tsx)
 * retrieved from the SecuritySolutionContext.
 *
 * This component renders an {@link EuiButton}.
 *
 * @returns add to timeline button
 */
export const InvestigateInTimelineButton: VFC<InvestigateInTimelineButtonProps> = ({
  data,
  'data-test-subj': dataTestSub,
}) => {
  const { investigateInTimelineFn } = useInvestigateInTimeline({ indicator: data });
  if (!investigateInTimelineFn) {
    return <></>;
  }

  return (
    <EuiButton onClick={investigateInTimelineFn} fill data-test-subj={dataTestSub}>
      <FormattedMessage
        defaultMessage="Investigate in Timeline"
        id="xpack.threatIntelligence.investigateInTimelineButton"
      />
    </EuiButton>
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
export const InvestigateInTimelineButtonIcon: VFC<InvestigateInTimelineButtonProps> = ({
  data,
  'data-test-subj': dataTestSub,
}) => {
  const { investigateInTimelineFn } = useInvestigateInTimeline({ indicator: data });
  if (!investigateInTimelineFn) {
    return <></>;
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
