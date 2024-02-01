/*
 *
 *  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 *  * or more contributor license agreements. Licensed under the Elastic License
 *  * 2.0; you may not use this file except in compliance with the Elastic License
 *  * 2.0.
 *
 */

import React from 'react';
import { EuiFormRow, EuiIcon, EuiTextArea, EuiToolTip } from '@elastic/eui';

interface InstructionsFieldProps {
  label: string;
  helpText: string;
  placeholder: string;
  value?: string;
  onChange: (value: string) => void;
}

export const InstructionsField: React.FC<InstructionsFieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
  helpText,
}) => {
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    onChange(e.target.value);

  return (
    <EuiFormRow
      label={
        <EuiToolTip content={helpText}>
          <span>
            {label} <EuiIcon type="questionInCircle" color="subdued" />
          </span>
        </EuiToolTip>
      }
    >
      <EuiTextArea
        placeholder={placeholder}
        value={value}
        onChange={handlePromptChange}
        fullWidth
      />
    </EuiFormRow>
  );
};
