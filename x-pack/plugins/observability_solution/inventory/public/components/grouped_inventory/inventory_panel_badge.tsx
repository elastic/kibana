/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

export function InventoryPanelBadge({
  name,
  value,
  'data-test-subj': dataTestSubj,
}: {
  name: string;
  'data-test-subj'?: string;
  value: string | number;
}) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      data-test-subj={dataTestSubj}
      gutterSize="s"
      alignItems="center"
      css={css`
        padding: ${euiTheme.size.base};
      `}
    >
      <EuiFlexItem>
        <EuiText
          size="xs"
          css={css`
            font-weight: ${euiTheme.font.weight.bold};
          `}
        >
          {name}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiBadge color="hollow">{value}</EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
