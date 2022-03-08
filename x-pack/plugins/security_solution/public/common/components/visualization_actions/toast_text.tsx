/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';

import { VIEW_CASE } from './translations';

interface ToaseTextProps {
  href: string;
}

const ToastTextComponent: React.FC<ToaseTextProps> = ({ href }) => {
  return (
    <EuiFlexGroup justifyContent="center">
      <EuiFlexItem>
        <EuiLink href={href} target="_blank">
          {VIEW_CASE}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
ToastTextComponent.displayName = 'ToastTextComponent';
export const ToastText = React.memo(ToastTextComponent);
