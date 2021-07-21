/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { PackagePolicyConfigRecordEntry } from '../../../../../fleet/common';
import { SettingsForm } from './settings/settings_form';
import { apmSettings } from './settings/apm_settings';
import { rumSettings } from './settings/rum_settings';
import { tlsSettings } from './settings/tls_settings';

export type PackagePolicyValues = Record<
  string,
  PackagePolicyConfigRecordEntry
>;

interface Props {
  onChange: ({
    newVars,
    isValid,
  }: {
    newVars: Record<string, PackagePolicyConfigRecordEntry>;
    isValid: boolean;
  }) => void;
  values?: PackagePolicyValues;
}

export function APMPolicyForm({ values = {}, onChange }: Props) {
  function handleChange(key: string, value: any, isValid: boolean) {
    onChange({
      newVars: { ...values, [key]: { ...values[key], value } },
      isValid,
    });
  }
  return (
    <>
      <SettingsForm
        settings={apmSettings}
        values={values}
        onChange={handleChange}
      />
      <EuiSpacer />
      <SettingsForm
        settings={rumSettings}
        values={values}
        onChange={handleChange}
      />
      <EuiSpacer />
      <SettingsForm
        settings={tlsSettings}
        values={values}
        onChange={handleChange}
      />
    </>
  );
}
