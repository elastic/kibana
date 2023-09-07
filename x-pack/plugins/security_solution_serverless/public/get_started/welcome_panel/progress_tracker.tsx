/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { WELCOME_PANEL_PROGRESS_TRACKER_DESCRIPTION } from './translations';

const ProgressTrackerComponent = ({
  totalActiveSteps,
  totalStepsLeft,
}: {
  totalActiveSteps?: number | null;
  totalStepsLeft?: number | null;
}) => {
  if (totalActiveSteps != null && totalStepsLeft != null) {
    return (
      <>
        <strong
          css={css`
            font-wight: bold;
            color: black;
          `}
        >
          <FormattedMessage
            id="xpack.securitySolutionServerless.getStarted.welcomePanel.progressTracker.description"
            defaultMessage="{done} of {total} "
            values={{
              done: totalActiveSteps - totalStepsLeft,
              total: totalActiveSteps,
            }}
          />
        </strong>
        {WELCOME_PANEL_PROGRESS_TRACKER_DESCRIPTION(totalActiveSteps)}
      </>
    );
  }

  return null;
};

export const ProgressTracker = React.memo(ProgressTrackerComponent);
