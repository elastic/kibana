/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiToolTip } from '@elastic/eui';

/**
 * Applies CSS styling to enable text to be truncated with an ellipsis.
 * Example: "Don't leave me hanging..."
 *
 * Note: Requires a parent container with a defined width or max-width.
 */

const EllipsisText = styled.span`
  &,
  & * {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: top;
    white-space: nowrap;
  }
`;
EllipsisText.displayName = 'EllipsisText';

interface Props {
  showTooltip?: boolean;
  children: React.ReactNode;
}

export function TruncatableText({ showTooltip = false, children }: Props) {
  if (!showTooltip) return <EllipsisText>{children}</EllipsisText>;

  return (
    <EuiToolTip display="block" content={children}>
      <EllipsisText>{children}</EllipsisText>
    </EuiToolTip>
  );
}
