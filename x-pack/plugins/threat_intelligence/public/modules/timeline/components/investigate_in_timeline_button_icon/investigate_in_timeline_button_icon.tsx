/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useInvestigateInTimeline } from '../../hooks/use_investigate_in_timeline';
import { Indicator } from '../../../../../common/types/indicator';

const BUTTON_LABEL: string = i18n.translate(
  'xpack.threatIntelligence.investigateInTimelineButtonIcon',
  {
    defaultMessage: 'Investigate in Timeline',
  }
);

export interface InvestigateInTimelineButtonIconProps {
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
 * Investigate in timeline button, supports being passed a {@link Indicator}.
 * This implementation uses the InvestigateInTimelineAction component (x-pack/plugins/security_solution/public/detections/components/alerts_table/timeline_actions/investigate_in_timeline_action.tsx)
 * retrieved from the SecuritySolutionContext.
 *
 * @returns add to timeline button or an empty component.
 */
export const InvestigateInTimelineButtonIcon: VFC<InvestigateInTimelineButtonIconProps> = ({
  data,
  ...props
}) => {
  const { onClick } = useInvestigateInTimeline({ indicator: data });

  if (!onClick) {
    return <></>;
  }

  return (
    <EuiToolTip content={BUTTON_LABEL}>
      <EuiButtonIcon
        aria-label={BUTTON_LABEL}
        iconType="timeline"
        iconSize="s"
        size="xs"
        color="primary"
        onClick={onClick}
        {...props}
      />
    </EuiToolTip>
  );
};
