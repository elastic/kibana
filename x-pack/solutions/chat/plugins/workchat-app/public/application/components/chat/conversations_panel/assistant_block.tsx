/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/css';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiHealth,
  EuiAvatar,
  EuiSkeletonText,
} from '@elastic/eui';
import { useAgent } from '../../../hooks/use_agent';
import { chatCommonLabels } from '../i18n';

interface AssistantBlockProps {
  agentId: string;
}

export const AssistantBlock: React.FC<AssistantBlockProps> = ({ agentId }) => {
  const { agent } = useAgent({ agentId });
  const { euiTheme } = useEuiTheme();

  const agentNameClassName = css`
    font-weight: ${euiTheme.font.weight.semiBold};
  `;

  return (
    <EuiFlexGroup direction="row" alignItems="center" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiAvatar
          name={agent?.name ?? 'Assistant'}
          size="l"
          type="user"
          initials={agent?.avatar?.text}
          color={agent?.avatar?.color}
        />
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiFlexGroup
          direction="column"
          gutterSize="xs"
          alignItems="flexStart"
          justifyContent="center"
        >
          <EuiFlexItem grow={false}>
            <EuiSkeletonText lines={1} size="s" isLoading={agent === undefined}>
              <EuiText size="s" className={agentNameClassName}>
                {agent?.name}
              </EuiText>
            </EuiSkeletonText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiHealth color="success">
              <EuiText size="xs">{chatCommonLabels.assistantStatus.healthy}</EuiText>
            </EuiHealth>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
