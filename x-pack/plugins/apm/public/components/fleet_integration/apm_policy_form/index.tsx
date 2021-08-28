/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { OnFormChangeFn, PackagePolicyVars } from './typings';
import { APMSettingsForm } from './settings/apm_settings';
import { RUMSettingsForm } from './settings/rum_settings';
import { TLSSettingsForm } from './settings/tls_settings';

interface Props {
  onChange: OnFormChangeFn;
  vars?: PackagePolicyVars;
  isCloudPolicy: boolean;
}

export function APMPolicyForm({ vars = {}, isCloudPolicy, onChange }: Props) {
  return (
    <>
      <APMSettingsForm
        vars={vars}
        onChange={onChange}
        isCloudPolicy={isCloudPolicy}
      />
      <EuiSpacer />
      <RUMSettingsForm vars={vars} onChange={onChange} />
      <EuiSpacer />
      <TLSSettingsForm vars={vars} onChange={onChange} />
    </>
  );
}
