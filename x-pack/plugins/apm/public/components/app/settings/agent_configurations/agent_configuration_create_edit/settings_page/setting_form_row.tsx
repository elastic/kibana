/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFormRow,
  EuiFieldText,
  EuiFieldNumber,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCode,
  EuiSpacer,
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SettingDefinition } from '../../../../../../../common/agent_configuration/setting_definitions/types';
import { validateSetting } from '../../../../../../../common/agent_configuration/setting_definitions';
import {
  amountAndUnitToString,
  amountAndUnitToObject,
} from '../../../../../../../common/agent_configuration/amount_and_unit';
import { SelectWithPlaceholder } from '../../../../../shared/select_with_placeholder';

function FormRow({
  setting,
  value,
  onChange,
}: {
  setting: SettingDefinition;
  value?: string;
  onChange: (key: string, value: string) => void;
}) {
  switch (setting.type) {
    case 'float':
    case 'text': {
      return (
        <EuiFieldText
          placeholder={setting.placeholder}
          value={value || ''}
          onChange={(e) => onChange(setting.key, e.target.value)}
        />
      );
    }

    case 'integer': {
      return (
        <EuiFieldNumber
          placeholder={setting.placeholder}
          value={(value as any) || ''}
          min={setting.min}
          max={setting.max}
          onChange={(e) => onChange(setting.key, e.target.value)}
        />
      );
    }

    case 'select': {
      return (
        <SelectWithPlaceholder
          placeholder={setting.placeholder}
          options={setting.options}
          value={value}
          onChange={(e) => onChange(setting.key, e.target.value)}
        />
      );
    }

    case 'boolean': {
      return (
        <SelectWithPlaceholder
          placeholder={setting.placeholder}
          options={[
            { text: 'true', value: 'true' },
            { text: 'false', value: 'false' },
          ]}
          value={value}
          onChange={(e) => onChange(setting.key, e.target.value)}
        />
      );
    }

    case 'bytes':
    case 'duration': {
      const { amount, unit } = amountAndUnitToObject(value ?? '');

      return (
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiFieldNumber
              placeholder={setting.placeholder}
              value={amount}
              onChange={(e) =>
                onChange(
                  setting.key,
                  amountAndUnitToString({
                    amount: e.target.value,
                    unit,
                  })
                )
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SelectWithPlaceholder
              placeholder={i18n.translate('xpack.apm.unitLabel', {
                defaultMessage: 'Select unit',
              })}
              value={unit}
              options={setting.units?.map((text) => ({ text, value: text }))}
              onChange={(e) =>
                onChange(
                  setting.key,
                  amountAndUnitToString({ amount, unit: e.target.value })
                )
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    default:
      throw new Error(`Unknown type "${(setting as SettingDefinition).type}"`);
  }
}

export function SettingFormRow({
  isUnsaved,
  setting,
  value,
  onChange,
}: {
  isUnsaved: boolean;
  setting: SettingDefinition;
  value?: string;
  onChange: (key: string, value: string) => void;
}) {
  const { isValid, message } = validateSetting(setting, value);
  const isInvalid = value != null && value !== '' && !isValid;

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={
        <h3>
          {setting.label}{' '}
          {isUnsaved && (
            <EuiIconTip
              type={'dot'}
              color={'warning'}
              content={i18n.translate(
                'xpack.apm.agentConfig.unsavedSetting.tooltip',
                { defaultMessage: 'Unsaved' }
              )}
            />
          )}
        </h3>
      }
      description={
        <>
          {setting.description}

          {setting.defaultValue && (
            <>
              <EuiSpacer />
              <EuiCode>Default: {setting.defaultValue}</EuiCode>
            </>
          )}
        </>
      }
    >
      <EuiFormRow label={setting.key} error={message} isInvalid={isInvalid}>
        <FormRow onChange={onChange} setting={setting} value={value} />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
}
