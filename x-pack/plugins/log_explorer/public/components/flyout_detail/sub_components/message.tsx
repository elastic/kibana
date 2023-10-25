/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FlyoutDoc } from '../types';
import { flyoutMessageLabel } from '../translations';

interface MessageProps {
  message: FlyoutDoc['message'];
}

export function Message({ message }: MessageProps) {
  if (!message) return null;

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem>
        <EuiText color="subdued" size="xs">
          {flyoutMessageLabel}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCodeBlock overflowHeight={100} paddingSize="m" isCopyable language="txt" fontSize="m">
          {message}
        </EuiCodeBlock>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
