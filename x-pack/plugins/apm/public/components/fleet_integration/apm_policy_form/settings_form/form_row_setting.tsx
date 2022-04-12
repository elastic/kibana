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
import styled from 'styled-components';
import { FormRowOnChange } from './';
import { SettingsRow } from '../typings';
import { CodeEditor } from '../../../../../../../../src/plugins/kibana_react/public';

const FixedHeightDiv = styled.div`
  height: 300px;
`;

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
          data-test-subj={row.dataTestSubj}
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
          data-test-subj={row.dataTestSubj}
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
          data-test-subj={row.dataTestSubj}
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
          data-test-subj={row.dataTestSubj}
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
          data-test-subj={row.dataTestSubj}
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
    case 'yaml': {
      return (
        <FixedHeightDiv>
          <CodeEditor
            languageId="yaml"
            width="100%"
            height="300px"
            value={value}
            onChange={(val) => {
              onChange(row.key, val);
            }}
            options={{
              ariaLabel: i18n.translate(
                'xpack.apm.fleet_integration.settings.yamlCodeEditor',
                {
                  defaultMessage: 'YAML Code Editor',
                }
              ),
              wordWrap: 'off',
              tabSize: 2,
              // To avoid left margin
              lineNumbers: 'off',
              lineNumbersMinChars: 0,
              folding: false,
              lineDecorationsWidth: 0,
              overviewRulerBorder: false,
            }}
          />
        </FixedHeightDiv>
      );
    }
    default:
      throw new Error(`Unknown type "${row.type}"`);
  }
}
