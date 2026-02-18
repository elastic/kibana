/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useEuiTheme, transparentize, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';

interface NodeLabelProps {
  label: string;
  selected?: boolean;
}

export const NodeLabel = memo(({ label, selected = false }: NodeLabelProps) => {
  const { euiTheme } = useEuiTheme();

  const labelStyles = css`
    font-size: ${euiTheme.size.s};
    color: ${selected ? euiTheme.colors.textPrimary : euiTheme.colors.textParagraph};
    font-family: ${euiTheme.font.family};
    max-width: 200px;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    background-color: ${selected ? transparentize(euiTheme.colors.primary, 0.1) : 'transparent'};
    padding: ${euiTheme.size.xs};
    border-radius: ${euiTheme.border.radius.medium};
    pointer-events: none;
  `;

  return (
    <EuiFlexItem grow={false} css={labelStyles} aria-hidden="true">
      {label}
    </EuiFlexItem>
  );
});

NodeLabel.displayName = 'NodeLabel';
