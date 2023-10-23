/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { copyToClipboard, EuiButtonEmpty, EuiCopy } from '@elastic/eui';
import type { FC, ReactElement } from 'react';
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
   * Button main text (next to icon)
   */
  text: ReactElement;
  /**
   * Icon name (value coming from EUI)
   */
  iconType: string;
  /**
   * Button size (values coming from EUI)
   */
  size?: 's' | 'm' | 'xs';
  /**
   * Aria label value for the button
   */
  ariaLabel: string;
  /**
   Data test subject string for testing
   */
  ['data-test-subj']?: string;
}

/**
 * Copy to clipboard component
 */
export const CopyToClipboard: FC<CopyToClipboardProps> = ({
  rawValue,
  modifier,
  text,
  iconType,
  size = 'm',
  ariaLabel,
  'data-test-subj': dataTestSubj,
}) => {
  return (
    <EuiCopy textToCopy={rawValue}>
      {(copy) => (
        <EuiButtonEmpty
          onClick={() => {
            copy();

            if (modifier) {
              const modifiedCopyValue = modifier(rawValue);
              copyToClipboard(modifiedCopyValue);
            } else {
              copyToClipboard(rawValue);
            }
          }}
          iconType={iconType}
          size={size}
          aria-label={ariaLabel}
          data-test-subj={dataTestSubj}
        >
          {text}
        </EuiButtonEmpty>
      )}
    </EuiCopy>
  );
};

CopyToClipboard.displayName = 'CopyToClipboard';
