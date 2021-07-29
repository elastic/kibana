/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonEmpty,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { PackagePolicyVars } from '../typings';
import { FormRowSetting } from './form_row_setting';
import { SettingDefinition } from './typings';
import { validateSettingValue } from './utils';

export type FormRowOnChange = (key: string, value: any) => void;

function FormRow({
  initialSetting,
  vars,
  onChange,
}: {
  initialSetting: SettingDefinition;
  vars?: PackagePolicyVars;
  onChange: FormRowOnChange;
}) {
  function getSettingFormRow(setting: SettingDefinition) {
    if (setting.type === 'advanced_option') {
      return (
        <AdvancedOptions>
          {setting.settings.map((advancedSetting) =>
            getSettingFormRow(advancedSetting)
          )}
        </AdvancedOptions>
      );
    } else {
      const { key } = setting;
      const value = vars?.[key]?.value;
      const { isValid, message } = validateSettingValue(setting, value);
      return (
        <React.Fragment key={key}>
          <EuiDescribedFormGroup
            title={<h3>{setting.rowTitle}</h3>}
            description={setting.rowDescription}
          >
            <EuiFormRow
              label={setting.label}
              isInvalid={!isValid}
              error={isValid ? undefined : message}
              helpText={<EuiText size="xs">{setting.helpText}</EuiText>}
              labelAppend={
                <EuiText size="xs" color="subdued">
                  {setting.labelAppend}
                </EuiText>
              }
            >
              <FormRowSetting
                setting={setting}
                onChange={onChange}
                value={value}
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>
          {setting.settings &&
            value &&
            setting.settings.map((childSettings) =>
              getSettingFormRow(childSettings)
            )}
        </React.Fragment>
      );
    }
  }
  return getSettingFormRow(initialSetting);
}
interface Props {
  title: string;
  subtitle: string;
  settings: SettingDefinition[];
  vars?: PackagePolicyVars;
  onChange: FormRowOnChange;
}

export function SettingsForm({
  title,
  subtitle,
  settings,
  vars,
  onChange,
}: Props) {
  return (
    <EuiPanel>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            {subtitle}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" />

      {settings.map((setting) => {
        return FormRow({
          initialSetting: setting,
          vars,
          onChange,
        });
      })}
    </EuiPanel>
  );
}

function AdvancedOptions({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <EuiButtonEmpty
        iconType={isOpen ? 'arrowDown' : 'arrowRight'}
        onClick={() => {
          setIsOpen((state) => !state);
        }}
      >
        {i18n.translate(
          'xpack.apm.fleet_integration.settings.advancedOptionsLavel',
          { defaultMessage: 'Advanced options' }
        )}
      </EuiButtonEmpty>
      {isOpen && (
        <>
          <EuiHorizontalRule />
          {children}
        </>
      )}
    </>
  );
}
