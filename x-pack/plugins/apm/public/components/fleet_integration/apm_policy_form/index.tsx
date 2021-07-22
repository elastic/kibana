/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { OnFormChangeFn, PackagePolicyValues } from './typings';
import { APMSettingsForm } from './settings/apm_settings';
import { RUMSettingsForm } from './settings/rum_settings';
import { TLSSettingsForm } from './settings/tls_settings';

interface Props {
  onChange: OnFormChangeFn;
  values?: PackagePolicyValues;
}

export function APMPolicyForm({ values = {}, onChange }: Props) {
  return (
    <>
      <APMSettingsForm values={values} onChange={onChange} />
      <EuiSpacer />
      <RUMSettingsForm values={values} onChange={onChange} />
      <EuiSpacer />
      <TLSSettingsForm values={values} onChange={onChange} />
    </>
  );
}
