/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingElastic, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';

import type { GenerationInterval } from '@kbn/elastic-assistant-common';
import { useKibana } from '../../../common/lib/kibana';
import { Countdown } from './countdown';
import { LoadingMessages } from './loading_messages';

const BACKGROUND_COLOR_LIGHT = '#E6F1FA';
const BACKGROUND_COLOR_DARK = '#0B2030';

const BORDER_COLOR_DARK = '#0B2030';

interface Props {
  alertsCount: number;
  approximateFutureTime: Date | null;
  connectorIntervals: GenerationInterval[];
}

const LoadingCalloutComponent: React.FC<Props> = ({
  alertsCount,
  approximateFutureTime,
  connectorIntervals,
}) => {
  const { euiTheme } = useEuiTheme();
  const { theme } = useKibana().services;

  const leftContent = useMemo(
    () => (
      <EuiFlexGroup alignItems="center" data-test-subj="leftContent" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiLoadingElastic data-test-subj="loadingElastic" size="l" />
        </EuiFlexItem>

        <EuiFlexItem
          css={css`
            margin-left: ${euiTheme.size.m};
          `}
          grow={false}
        >
          <LoadingMessages alertsCount={alertsCount} />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [alertsCount, euiTheme.size.m]
  );

  const isDarkMode = theme.getTheme().darkMode === true;

  return (
    <div
      css={css`
        background-color: ${isDarkMode ? BACKGROUND_COLOR_DARK : BACKGROUND_COLOR_LIGHT};
        border: 1px solid ${isDarkMode ? BORDER_COLOR_DARK : euiTheme.colors.lightShade};
        border-radius: 6px;
        padding: ${euiTheme.size.base};
      `}
      data-test-subj="loadingCallout"
    >
      <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>{leftContent}</EuiFlexItem>

        <EuiFlexItem grow={false}>
          <Countdown
            approximateFutureTime={approximateFutureTime}
            connectorIntervals={connectorIntervals}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

LoadingCalloutComponent.displayName = 'LoadingCallout';

export const LoadingCallout = React.memo(LoadingCalloutComponent);
