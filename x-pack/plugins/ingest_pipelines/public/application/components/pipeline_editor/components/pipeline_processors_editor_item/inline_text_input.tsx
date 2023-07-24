/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiInlineEditText } from '@elastic/eui';

export interface Props {
  placeholder: string;
  ariaLabel: string;
  onChange: (value: string) => void;
  /**
   * Whether the containing element of the text input can be focused.
   *
   * If it cannot be focused, this component cannot switch to showing
   * the text input field.
   *
   * Defaults to false.
   */
  disabled?: boolean;
  text?: string;
}

function _InlineTextInput({
  placeholder,
  text,
  ariaLabel,
  disabled = false,
  onChange,
}: Props): React.ReactElement<any, any> | null {
  return (
    <EuiInlineEditText
      size="s"
      defaultValue={text || ''}
      placeholder={placeholder}
      inputAriaLabel={ariaLabel}
      isReadOnly={disabled}
    />
  );
}

export const InlineTextInput = memo(_InlineTextInput);
