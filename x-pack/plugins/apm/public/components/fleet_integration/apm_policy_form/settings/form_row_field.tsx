/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldNumber } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import { EuiFieldText, EuiSwitch, EuiTextArea } from '@elastic/eui';
import React from 'react';
import { Field, FormRowOnChange } from './settings_form';

interface Props {
  field: Field;
  value?: any;
  onChange: FormRowOnChange;
}

export function FormRowField({ field, value, onChange }: Props) {
  switch (field.type) {
    case 'bool': {
      return (
        <EuiSwitch
          label={field.label || (value ? 'Enabled' : 'Disabled')}
          checked={value}
          onChange={(e) => {
            onChange(field.key, e.target.checked);
          }}
        />
      );
    }
    case 'text': {
      return (
        <EuiFieldText
          value={value}
          prepend={field.prependIcon && <EuiIcon type={field.prependIcon} />}
          onChange={(e) => {
            onChange(field.key, e.target.value);
          }}
        />
      );
    }
    case 'area': {
      return (
        <EuiTextArea
          value={value}
          onChange={(e) => {
            onChange(field.key, e.target.value);
          }}
        />
      );
    }
    case 'integer': {
      return (
        <EuiFieldNumber
          value={value}
          // min={setting.min}
          // max={setting.max}
          onChange={(e) => {
            onChange(field.key, e.target.value);
          }}
        />
      );
    }
    default:
      throw new Error(`Unknown type "${field.type}"`);
  }
}
