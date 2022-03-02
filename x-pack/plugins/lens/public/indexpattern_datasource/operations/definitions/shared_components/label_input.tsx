/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { EuiFieldText, keys } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '../../../../shared_components';

export const LabelInput = ({
  value,
  onChange,
  placeholder,
  inputRef,
  onSubmit,
  dataTestSubj,
  compressed,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputRef?: React.MutableRefObject<HTMLInputElement | undefined>;
  onSubmit?: () => void;
  dataTestSubj?: string;
  compressed?: boolean;
}) => {
  const { inputValue, handleInputChange } = useDebouncedValue({ value, onChange });
  const localKeyHold = useRef(false);

  return (
    <EuiFieldText
      data-test-subj={dataTestSubj || 'lens-labelInput'}
      value={inputValue}
      onChange={(e) => handleInputChange(e.target.value)}
      fullWidth
      placeholder={placeholder || ''}
      inputRef={(node) => {
        if (inputRef && node) {
          inputRef.current = node;
        }
      }}
      onKeyDown={() => {
        localKeyHold.current = true;
      }}
      onKeyUp={({ key }: React.KeyboardEvent<HTMLInputElement>) => {
        // only submit on key up in case the user started the keypress while the input was focused
        if (localKeyHold.current && keys.ENTER === key && onSubmit) {
          onSubmit();
        }
        localKeyHold.current = false;
      }}
      prepend={i18n.translate('xpack.lens.labelInput.label', {
        defaultMessage: 'Label',
      })}
      compressed={compressed}
    />
  );
};
