/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useEffect } from 'react';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import type { PackagePolicyReplaceDefineStepExtensionComponentProps } from '@kbn/fleet-plugin/public/types';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { assertNever } from '@kbn/std';
import { useParams } from 'react-router-dom';
import type { PostureInput } from '../../../common/types';
import { PolicyTemplateInputSelector } from './policy_template_input_selector';
import { getEnabledPostureInput, getPosturePolicy } from './utils';
import { CLOUDBEAT_AWS, CLOUDBEAT_VANILLA } from '../../../common/constants';
import type { AwsCredentialsType } from './aws_credentials_form';
import { PolicyTemplateVarsForm } from './policy_template_form';
import { DefineIntegrationFields } from './define_integration';
import { PolicyTemplateSelector } from './policy_template_selector';

const EditPageStepTitle = () => (
  <>
    <EuiSpacer />
    <EuiTitle size="s">
      <h2>
        <FormattedMessage
          id="xpack.csp.fleetIntegration.integrationSettingsTitle"
          defaultMessage="Integration Settings"
        />
      </h2>
    </EuiTitle>
    <EuiSpacer />
  </>
);

const DEFAULT_INPUT_TYPE = { kspm: CLOUDBEAT_VANILLA, cspm: CLOUDBEAT_AWS } as const;
const DEFAULT_AWS_VARS_GROUP: AwsCredentialsType = 'assume_role';

// Variables that are not shown to the user but are required for the integration to work
const getHiddenInputVars = (inputType: PostureInput) => {
  switch (inputType) {
    case 'cloudbeat/cis_aws':
    case 'cloudbeat/cis_eks':
      return { 'aws.credentials.type': { value: DEFAULT_AWS_VARS_GROUP } };
    case 'cloudbeat/cis_gcp':
    case 'cloudbeat/cis_azure':
    case 'cloudbeat/cis_k8s':
      return undefined;
  }

  assertNever(inputType);
};

export const CspReplaceDefineStep = memo<PackagePolicyReplaceDefineStepExtensionComponentProps>(
  ({ newPolicy, onChange, isEditPage, validationResults }) => {
    const { integration } = useParams<{ integration: string }>();
    const input = getEnabledPostureInput(newPolicy);

    const updatePolicy = (updatedPolicy: NewPackagePolicy) =>
      onChange({ isValid: true, updatedPolicy });

    /**
     * - Updates policy inputs by user selection
     * - Updates hidden policy vars
     */
    const setEnabledPolicyInput = (inputType: PostureInput) =>
      updatePolicy(getPosturePolicy(newPolicy, inputType, getHiddenInputVars(inputType)));

    useEffect(() => {
      if (isEditPage) return;

      // Pick default input type for policy template.
      // Only 1 enabled input is supported when all inputs are initially enabled.
      setEnabledPolicyInput(DEFAULT_INPUT_TYPE[input.policy_template]);

      // Required for mount only to ensure a single input type is selected
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditPage]);

    return (
      <div>
        {!!isEditPage && <EditPageStepTitle />}
        {!integration && (
          <PolicyTemplateSelector
            selectedTemplate={input.policy_template!}
            policy={newPolicy}
            setPolicyTemplate={(template) => setEnabledPolicyInput(DEFAULT_INPUT_TYPE[template])}
          />
        )}
        <PolicyTemplateInputSelector
          input={input}
          setInput={setEnabledPolicyInput}
          disabled={!!isEditPage}
        />
        <EuiSpacer />
        <DefineIntegrationFields
          validationResults={validationResults}
          newPolicy={newPolicy}
          onChange={(field, value) => updatePolicy({ ...newPolicy, [field]: value })}
        />
        <PolicyTemplateVarsForm newPolicy={newPolicy} onChange={onChange} />
        <EuiSpacer />
      </div>
    );
  }
);

CspReplaceDefineStep.displayName = 'CspReplaceDefineStep';

// eslint-disable-next-line import/no-default-export
export { CspReplaceDefineStep as default };
