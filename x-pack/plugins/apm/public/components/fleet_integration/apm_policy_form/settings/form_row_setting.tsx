/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldNumber,
  EuiFieldText,
  EuiIcon,
  EuiSwitch,
  EuiTextArea,
  EuiComboBox,
} from '@elastic/eui';
import React from 'react';
import { FormRowOnChange } from './settings_form';
import { SettingDefinition } from './types';

interface Props {
  setting: SettingDefinition;
  value?: any;
  onChange: FormRowOnChange;
}

export function FormRowSetting({ setting, value, onChange }: Props) {
  switch (setting.type) {
    case 'boolean': {
      return (
        <EuiSwitch
          label={setting.placeholder || (value ? 'Enabled' : 'Disabled')}
          checked={value}
          onChange={(e) => {
            onChange(setting.key, e.target.checked);
          }}
        />
      );
    }
    case 'duration':
    case 'text': {
      return (
        <EuiFieldText
          value={value}
          prepend={
            setting.prependIcon && <EuiIcon type={setting.prependIcon} />
          }
          onChange={(e) => {
            onChange(setting.key, e.target.value);
          }}
        />
      );
    }
    case 'area': {
      return (
        <EuiTextArea
          value={value}
          onChange={(e) => {
            onChange(setting.key, e.target.value);
          }}
        />
      );
    }
    case 'bytes':
    case 'integer': {
      return (
        <EuiFieldNumber
          value={value}
          onChange={(e) => {
            onChange(setting.key, e.target.value);
          }}
        />
      );
    }
    case 'combo': {
      const comboOptions = (value as any[]).map((label) => ({ label }));
      return (
        <EuiComboBox
          placeholder="Select or create options"
          options={comboOptions}
          selectedOptions={comboOptions}
          onChange={(option) => {
            onChange(
              setting.key,
              option.map(({ label }) => label)
            );
          }}
          onCreateOption={(newOption) => {
            onChange(setting.key, [...value, newOption]);
          }}
          isClearable={true}
        />
      );
    }
    default:
      throw new Error(`Unknown type "${setting.type}"`);
  }
}
