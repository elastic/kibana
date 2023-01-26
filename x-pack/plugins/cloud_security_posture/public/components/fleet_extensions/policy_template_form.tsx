/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { PackagePolicyReplaceDefineStepExtensionComponentProps } from '@kbn/fleet-plugin/public/types';
import { getEnabledPostureInput, getPosturePolicy } from './utils';
import { AwsCredentialsForm, isAwsInput } from './aws_credentials_form2';

type Props = PackagePolicyReplaceDefineStepExtensionComponentProps;

export const PolicyTemplateVarsForm = ({ newPolicy, onChange }: Props) => {
  const input = getEnabledPostureInput(newPolicy);

  const updatePolicy = (updatedPolicy: NewPackagePolicy) =>
    onChange({ isValid: true, updatedPolicy });

  if (!isAwsInput(input)) return null;

  return (
    <AwsCredentialsForm
      input={input}
      updateVars={(inputType, vars) => updatePolicy(getPosturePolicy(newPolicy, inputType, vars))}
    />
  );
};
