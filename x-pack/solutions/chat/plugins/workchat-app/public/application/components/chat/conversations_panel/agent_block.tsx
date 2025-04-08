/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, type MouseEvent } from 'react';
import { css } from '@emotion/css';
import {
  EuiText,
  EuiTitle,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  EuiButton,
  useEuiTheme,
  euiScrollBarStyles,
  EuiSpacer,
  EuiHealth,
  EuiAvatar,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Agent } from '../../../../../common/agents';

export const AgentBlock: React.FC<{ agent: Agent }> = ({ agent }) => {
  //

  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiAvatar name="assistant" size="l" type="user" />
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiFlexGroup
          direction="column"
          gutterSize="xs"
          alignItems="flexStart"
          justifyContent="center"
        >
          <EuiFlexItem grow={false}>
            <EuiText
              size="s"
              className={css`
                font-weight: ${euiTheme.font.weight.semiBold};
              `}
            >
              Assistant name
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiHealth color="success">
              <EuiText size="xs">Healthy</EuiText>
            </EuiHealth>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
