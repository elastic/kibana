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
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormRowOnChange } from './';
import { SettingsRow } from '../typings';

interface Props {
  row: SettingsRow;
  value?: any;
  onChange: FormRowOnChange;
  isDisabled?: boolean;
}

const ENABLED_LABEL = i18n.translate(
  'xpack.apm.fleet_integration.settings.enabledLabel',
  { defaultMessage: 'Enabled' }
);
const DISABLED_LABEL = i18n.translate(
  'xpack.apm.fleet_integration.settings.disabledLabel',
  { defaultMessage: 'Disabled' }
);

export function FormRowSetting({ row, value, onChange, isDisabled }: Props) {
  switch (row.type) {
    case 'boolean': {
      return (
        <EuiSwitch
          disabled={isDisabled}
          label={row.placeholder || (value ? ENABLED_LABEL : DISABLED_LABEL)}
          checked={value}
          onChange={(e) => {
            onChange(row.key, e.target.checked);
          }}
        />
      );
    }
    case 'duration':
    case 'text': {
      return (
        <EuiFieldText
          disabled={isDisabled}
          value={value}
          prepend={isDisabled ? <EuiIcon type="lock" /> : undefined}
          onChange={(e) => {
            onChange(row.key, e.target.value);
          }}
        />
      );
    }
    case 'area': {
      return (
        <EuiTextArea
          disabled={isDisabled}
          value={value}
          onChange={(e) => {
            onChange(row.key, e.target.value);
          }}
        />
      );
    }
    case 'bytes':
    case 'integer': {
      return (
        <EuiFieldNumber
          disabled={isDisabled}
          value={value}
          onChange={(e) => {
            onChange(row.key, e.target.value);
          }}
        />
      );
    }
    case 'combo': {
      const comboOptions = Array.isArray(value)
        ? value.map((label) => ({ label }))
        : [];
      return (
        <EuiComboBox
          noSuggestions
          placeholder={i18n.translate(
            'xpack.apm.fleet_integration.settings.selectOrCreateOptions',
            { defaultMessage: 'Select or create options' }
          )}
          options={comboOptions}
          selectedOptions={comboOptions}
          onChange={(option) => {
            onChange(
              row.key,
              option.map(({ label }) => label)
            );
          }}
          onCreateOption={(newOption) => {
            onChange(row.key, [...value, newOption]);
          }}
          isClearable={true}
        />
      );
    }
    default:
      throw new Error(`Unknown type "${row.type}"`);
  }
}
