/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadge, useEuiTheme } from '@elastic/eui';
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
    <div
      data-test-subj={dataTestSubj}
      css={css`
        padding: ${euiTheme.size.base};
      `}
    >
      <span
        className="inventoryPanelBadge"
        css={css`
          font-weight: ${euiTheme.font.weight.bold};
          margin-right: ${euiTheme.size.s};
        `}
      >
        {name}:
      </span>
      <EuiBadge color="hollow">{value}</EuiBadge>
    </div>
  );
}
