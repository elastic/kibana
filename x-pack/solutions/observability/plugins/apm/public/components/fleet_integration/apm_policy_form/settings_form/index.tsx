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
  EuiBetaBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import type { PackagePolicyVars, SettingsRow, PackageInfo, RegistryVarsEntry } from '../typings';
import { FormRowSetting } from './form_row_setting';
import { validateSettingValue } from './utils';

export type FormRowOnChange = (key: string, value: any) => void;

function FormRow({
  initialSetting,
  vars,
  onChange,
  packageInfo,
}: {
  initialSetting: SettingsRow;
  vars?: PackagePolicyVars;
  onChange: FormRowOnChange;
  packageInfo?: PackageInfo;
}) {
  function getSettingFormRow(row: SettingsRow) {
    if (row.type === 'advanced_setting') {
      return (
        <AdvancedOptions>
          {row.settings.map((advancedSetting) => getSettingFormRow(advancedSetting))}
        </AdvancedOptions>
      );
    }

    const { key } = row;
    const configEntry = vars?.[key];
    // hides a field that doesn't have its key defined in vars.
    // This is most likely to happen when a field is no longer supported in the current package version
    if (!configEntry) {
      return null;
    }

    const { value, frozen } = configEntry;
    const { isValid, message } = validateSettingValue(row, value);
    return (
      <React.Fragment key={key}>
        <EuiDescribedFormGroup title={<h3>{row.rowTitle}</h3>} description={row.rowDescription}>
          <EuiFormRow
            label={row.label}
            isInvalid={!isValid}
            error={isValid ? undefined : message}
            helpText={<EuiText size="xs">{row.helpText}</EuiText>}
            labelAppend={
              <EuiText size="xs" color="subdued">
                {row.labelAppend}
              </EuiText>
            }
          >
            <FormRowSetting
              row={row}
              onChange={onChange}
              value={value}
              isDisabled={frozen}
              registryPolicyVar={getRegistryEntryVar(key, packageInfo)}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
        {row.settings &&
          value &&
          row.settings.map((childSettings) => getSettingFormRow(childSettings))}
      </React.Fragment>
    );
  }
  return getSettingFormRow(initialSetting);
}

export interface SettingsSection {
  id: string;
  title: string;
  subtitle?: string;
  settings: SettingsRow[];
  isPlatinumLicence?: boolean;
}

interface Props {
  settingsSection: SettingsSection;
  vars?: PackagePolicyVars;
  packageInfo?: PackageInfo;
  onChange: FormRowOnChange;
}

export function SettingsForm({ settingsSection, vars, onChange, packageInfo }: Props) {
  const { title, subtitle, settings, isPlatinumLicence } = settingsSection;
  return (
    <EuiPanel>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>
              {title} &nbsp;
              {isPlatinumLicence && (
                <EuiBetaBadge
                  label={i18n.translate('xpack.apm.fleet_integration.settings.platinumBadgeLabel', {
                    defaultMessage: 'Platinum',
                  })}
                  title={i18n.translate(
                    'xpack.apm.fleet_integration.settings.platinumBadgeTooltipTitle',
                    {
                      defaultMessage: 'Platinum license required',
                    }
                  )}
                  tooltipContent={i18n.translate(
                    'xpack.apm.fleet_integration.settings.platinumBadgeTooltipDescription',
                    {
                      defaultMessage:
                        'Configurations are saved but ignored if your Kibana licence is not Platinum.',
                    }
                  )}
                />
              )}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        {subtitle && (
          <EuiFlexItem>
            <EuiText size="s" color="subdued">
              {subtitle}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" />
      {settings.map((setting) => {
        return FormRow({
          initialSetting: setting,
          vars,
          onChange,
          packageInfo,
        });
      })}
    </EuiPanel>
  );
}

function AdvancedOptions({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem />
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                aria-label={i18n.translate(
                  'xpack.apm.advancedOptions.advancedoptionsButton.ariaLabel',
                  { defaultMessage: 'Advanced options' }
                )}
                data-test-subj="apmAdvancedOptionsAdvancedOptionsButton"
                iconType={isOpen ? 'arrowDown' : 'arrowRight'}
                onClick={() => {
                  setIsOpen((state) => !state);
                }}
              >
                {i18n.translate('xpack.apm.fleet_integration.settings.advancedOptionsLavel', {
                  defaultMessage: 'Advanced options',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isOpen && (
        <>
          <EuiHorizontalRule />
          {children}
        </>
      )}
    </>
  );
}

function getRegistryEntryVar(key: string, packageInfo: PackageInfo | undefined) {
  if (
    packageInfo &&
    packageInfo.policy_templates &&
    packageInfo.policy_templates.length > 0 &&
    'inputs' in packageInfo.policy_templates[0] &&
    Array.isArray(packageInfo.policy_templates[0].inputs) &&
    packageInfo.policy_templates[0].inputs.length > 0 &&
    packageInfo.policy_templates[0].inputs[0].vars
  ) {
    const registryPolicyVars: RegistryVarsEntry[] = packageInfo.policy_templates[0].inputs[0].vars;
    return registryPolicyVars.find((registryVar) => registryVar.name === key);
  }
}
