/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import type { GenerationInterval } from '@kbn/elastic-assistant-common';

import { useKibana } from '../../../../../common/lib/kibana';
import * as i18n from './translations';
import { GenerationTiming } from './generation_timing';

interface Props {
  connectorIntervals: GenerationInterval[];
}

const LastTimesPopoverComponent: React.FC<Props> = ({ connectorIntervals }) => {
  const { euiTheme } = useEuiTheme();
  const { theme } = useKibana().services;
  const isDarkMode = useMemo(() => theme.getTheme().darkMode === true, [theme]);

  return (
    <EuiFlexGroup
      css={css`
        width: 300px;
      `}
      data-test-subj="lastTimesPopover"
      direction="column"
      gutterSize="none"
    >
      <EuiFlexItem grow={false}>
        <EuiText
          color={isDarkMode ? 'subdued' : 'default'}
          data-test-subj="averageTimeIsCalculated"
          size="s"
        >
          {i18n.AVERAGE_TIME_IS_CALCULATED(connectorIntervals.length)}
        </EuiText>
        <EuiSpacer size="s" />
      </EuiFlexItem>

      {connectorIntervals.map((interval, index) => (
        <EuiFlexItem
          css={css`
            margin-bottom: ${euiTheme.size.xs};
          `}
          grow={false}
          key={index}
        >
          <GenerationTiming interval={interval} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

LastTimesPopoverComponent.displayName = 'LastTimesPopoverComponent';

export const LastTimesPopover = React.memo(LastTimesPopoverComponent);
