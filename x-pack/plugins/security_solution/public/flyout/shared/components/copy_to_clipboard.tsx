/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { copyToClipboard, EuiCopy } from '@elastic/eui';
import type { FC } from 'react';
import React from 'react';

export interface CopyToClipboardProps {
  /**
   * Value to save to the clipboard
   */
  rawValue: string;
  /**
   * Function to modify the raw value before saving to the clipboard
   */
  modifier?: (rawValue: string) => string;
  /**
   Data test subject string for testing
   */
  ['data-test-subj']?: string;
}

/**
 * Copy to clipboard wrapper component. It allows adding a copy to clipboard functionality to any element.
 * It expects the value to be copied with an optional function to modify the value if necessary.
 */
export const CopyToClipboard: FC<CopyToClipboardProps> = ({
  rawValue,
  modifier,
  'data-test-subj': dataTestSubj,
  children,
}) => {
  const copyFunction = (copy: Function) => {
    copy();

    if (modifier) {
      const modifiedCopyValue = modifier(rawValue);
      copyToClipboard(modifiedCopyValue);
    } else {
      copyToClipboard(rawValue);
    }
  };

  return (
    <EuiCopy textToCopy={rawValue}>
      {(copy) => (
        <div
          data-test-subj={dataTestSubj}
          onClick={() => copyFunction(copy)}
          onKeyDown={() => copyFunction(copy)}
        >
          {children}
        </div>
      )}
    </EuiCopy>
  );
};

CopyToClipboard.displayName = 'CopyToClipboard';
