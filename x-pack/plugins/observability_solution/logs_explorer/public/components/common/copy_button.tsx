/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexItem, copyToClipboard } from '@elastic/eui';
import React from 'react';
import { copyValueAriaText, copyValueText } from './translations';

export const CopyButton = ({ property, value }: { property: string; value: string }) => {
  const ariaCopyValueText = copyValueAriaText(property);

  return (
    <EuiFlexItem key="copyToClipboardAction">
      <EuiButtonEmpty
        size="s"
        iconType="copyClipboard"
        aria-label={ariaCopyValueText}
        onClick={() => copyToClipboard(value)}
        data-test-subj={`dataTableCellAction_copyToClipboardAction_${property}`}
      >
        {copyValueText}
      </EuiButtonEmpty>
    </EuiFlexItem>
  );
};
