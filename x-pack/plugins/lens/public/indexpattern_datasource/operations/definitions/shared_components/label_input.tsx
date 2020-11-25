/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { EuiFieldText, keys } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

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
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value, setInputValue]);

  useDebounce(() => onChange(inputValue), 256, [inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = String(e.target.value);
    setInputValue(val);
  };

  return (
    <EuiFieldText
      data-test-subj={dataTestSubj || 'lens-labelInput'}
      value={inputValue}
      onChange={handleInputChange}
      fullWidth
      placeholder={placeholder || ''}
      inputRef={(node) => {
        if (inputRef && node) {
          inputRef.current = node;
        }
      }}
      onKeyDown={({ key }: React.KeyboardEvent<HTMLInputElement>) => {
        if (keys.ENTER === key && onSubmit) {
          onSubmit();
        }
      }}
      prepend={i18n.translate('xpack.lens.labelInput.label', {
        defaultMessage: 'Label',
      })}
      compressed={compressed}
    />
  );
};
