/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiBadge, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { GenerationInterval } from '@kbn/elastic-assistant-common';
import moment from 'moment';
import React, { useMemo } from 'react';

import { PreferenceFormattedDate } from '../../../../../../common/components/formatted_date';
import { useKibana } from '../../../../../../common/lib/kibana';
import { MAX_SECONDS_BADGE_WIDTH } from '../helpers';
import * as i18n from '../translations';

interface Props {
  interval: GenerationInterval;
}

const GenerationTimingComponent: React.FC<Props> = ({ interval }) => {
  const { euiTheme } = useEuiTheme();
  const { theme } = useKibana().services;
  const isDarkMode = useMemo(() => theme.getTheme().darkMode === true, [theme]);

  return (
    <EuiFlexGroup alignItems="center" data-test-subj="generationTiming" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiBadge
          css={css`
            width: ${MAX_SECONDS_BADGE_WIDTH}px;
          `}
          color="hollow"
          data-test-subj="clockBadge"
          iconType="clock"
        >
          <span>
            {Math.trunc(interval.durationMs / 1000)}
            {i18n.SECONDS_ABBREVIATION}
          </span>
        </EuiBadge>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiText
          css={css`
            margin-left: ${euiTheme.size.s};
          `}
          color={isDarkMode ? 'subdued' : 'default'}
          data-test-subj="date"
          size="xs"
        >
          <PreferenceFormattedDate value={moment(interval.date).toDate()} />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

GenerationTimingComponent.displayName = 'GenerationTimingComponent';

export const GenerationTiming = React.memo(GenerationTimingComponent);
