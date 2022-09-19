/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useInvestigateInTimeline } from '../../hooks/use_investigate_in_timeline';
import { Indicator } from '../../../../../common/types/indicator';

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
 * Investigate in timeline button, supports being passed a {@link Indicator}.
 * This implementation uses the InvestigateInTimelineAction component (x-pack/plugins/security_solution/public/detections/components/alerts_table/timeline_actions/investigate_in_timeline_action.tsx)
 * retrieved from the SecuritySolutionContext.
 *
 * @returns add to timeline button or an empty component.
 */
export const InvestigateInTimelineButton: VFC<InvestigateInTimelineButtonProps> = ({
  data,
  ...props
}) => {
  const { onClick } = useInvestigateInTimeline({ indicator: data });

  if (!onClick) {
    return <></>;
  }

  return (
    <EuiButton onClick={onClick} fill {...props}>
      <FormattedMessage
        defaultMessage="Investigate in Timeline"
        id="xpack.threatIntelligence.investigateInTimelineButton"
      />
    </EuiButton>
  );
};
