/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { APMPolicyForm } from '.';
import {
  NewPackagePolicy,
  PackagePolicy,
  PackagePolicyConfigRecordEntry,
} from '../../../../../fleet/common';
import { PackagePolicyEditExtensionComponentProps } from '../../../../../fleet/public';

interface Props {
  policy: PackagePolicy;
  newPolicy: NewPackagePolicy;
  onChange: PackagePolicyEditExtensionComponentProps['onChange'];
}

export function EditAPMPolicyForm({ newPolicy, onChange }: Props) {
  const [firstInput, ...restInputs] = newPolicy?.inputs;
  const vars = firstInput?.vars;

  function handleChange(
    newVars: Record<string, PackagePolicyConfigRecordEntry>
  ) {
    onChange({
      isValid: true,
      updatedPolicy: {
        inputs: [{ ...firstInput, vars: newVars }, ...restInputs],
      },
    });
  }
  return <APMPolicyForm values={vars} onChange={handleChange} />;
}
