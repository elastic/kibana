/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { APMPolicyForm } from '.';
import { PackagePolicyEditExtensionComponentProps } from '../../../../../fleet/public';
import {
  PackagePolicy,
  PackagePolicyConfigRecordEntry,
} from '../../../../../fleet/common';

interface Props {
  policy: PackagePolicy;
  onChange: PackagePolicyEditExtensionComponentProps['onChange'];
}

export function EditAPMPolicyForm({ policy, onChange }: Props) {
  const [firstInput, ...restInputs] = policy?.inputs;
  const vars = firstInput?.vars;

  const { compiled_input: compiledInput, ...restFirstInput } = firstInput;

  function handleChange(
    newVars: Record<string, PackagePolicyConfigRecordEntry>
  ) {
    onChange({
      isValid: true,
      updatedPolicy: {
        inputs: [{ ...restFirstInput, vars: newVars }, ...restInputs],
      },
    });
  }
  return <APMPolicyForm values={vars} onChange={handleChange} />;
}
