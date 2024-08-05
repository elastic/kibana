/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPopoverTitle, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import type { GenerationInterval } from '@kbn/elastic-assistant-common';
import React, { useMemo } from 'react';
import { useKibana } from '../../../../common/lib/kibana';

import { LastTimesPopover } from '../countdown/last_times_popover';
import {
  getAverageIntervalSeconds,
  MAX_SECONDS_BADGE_WIDTH,
} from '../countdown/last_times_popover/helpers';
import { SECONDS_ABBREVIATION } from '../countdown/last_times_popover/translations';
import { AVERAGE_TIME } from '../countdown/translations';

const TEXT_COLOR = '#343741';

interface Props {
  connectorIntervals: GenerationInterval[];
}

const InfoPopoverBodyComponent: React.FC<Props> = ({ connectorIntervals }) => {
  const { theme } = useKibana().services;
  const isDarkMode = useMemo(() => theme.getTheme().darkMode === true, [theme]);

  const averageIntervalSeconds = useMemo(
    () => getAverageIntervalSeconds(connectorIntervals),
    [connectorIntervals]
  );

  return (
    <>
      <EuiPopoverTitle>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiBadge
              css={css`
                display: inline-block;
                max-width: ${MAX_SECONDS_BADGE_WIDTH}px;
              `}
              color="hollow"
              data-test-subj="averageTimeBadge"
              iconType="clock"
            >
              <span>
                {averageIntervalSeconds}
                {SECONDS_ABBREVIATION}
              </span>
            </EuiBadge>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiText
              color={isDarkMode ? 'default' : TEXT_COLOR}
              css={css`
                font-weight: 400;
              `}
              data-test-subj="averageTimeIsCalculated"
              size="s"
            >
              <span>{AVERAGE_TIME}</span>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverTitle>

      <LastTimesPopover connectorIntervals={connectorIntervals} />
    </>
  );
};

InfoPopoverBodyComponent.displayName = 'InfoPopoverBody';

export const InfoPopoverBody = React.memo(InfoPopoverBodyComponent);
