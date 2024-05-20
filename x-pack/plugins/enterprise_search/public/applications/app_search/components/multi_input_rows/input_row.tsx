/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiFieldText, EuiButtonIcon } from '@elastic/eui';

interface Props {
  value: string;
  placeholder: string;
  autoFocus: boolean;
  onChange(newValue: string): void;
  onDelete(): void;
  disableDelete: boolean;
  deleteLabel: string;
}

import './input_row.scss';

export const InputRow: React.FC<Props> = ({
  value,
  placeholder,
  autoFocus,
  onChange,
  onDelete,
  disableDelete,
  deleteLabel,
}) => (
  <EuiFlexGroup className="inputRow" alignItems="center" responsive={false} gutterSize="s">
    <EuiFlexItem>
      <EuiFieldText
        fullWidth
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButtonIcon
        iconType="trash"
        color="danger"
        onClick={onDelete}
        isDisabled={disableDelete}
        aria-label={deleteLabel}
        title={deleteLabel}
        data-test-subj="deleteInputRowButton"
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
