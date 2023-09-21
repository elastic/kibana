/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { NewPackagePolicy, PackageInfo } from '@kbn/fleet-plugin/common';
import { cspIntegrationDocsNavigation } from '../../../common/navigation/constants';
import {
  getCspmCloudFormationDefaultValue,
  getPosturePolicy,
  NewPackagePolicyPostureInput,
} from '../utils';
// import {
//   DEFAULT_MANUAL_AZURE_CREDENTIALS_TYPE,
//   getAwsCredentialsFormOptions,
//   getInputVarsFields,
// } from './get_aws_credentials_form_options';
import { CLOUDBEAT_AWS } from '../../../../common/constants';
import { AzureCredentialsType } from '../../../../common/types';

const getAzureCredentialsType = (
  input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_azure' }>
): AzureCredentialsType | undefined => input.streams[0].vars?.['azure.credentials.type']?.value;

const getAwsCloudFormationTemplate = (newPolicy: NewPackagePolicy) => {
  const template: string | undefined = newPolicy?.inputs?.find((i) => i.type === CLOUDBEAT_AWS)
    ?.config?.cloud_formation_template_url?.value;

  return template || undefined;
};

const updateCloudFormationPolicyTemplate = (
  newPolicy: NewPackagePolicy,
  updatePolicy: (policy: NewPackagePolicy) => void,
  templateUrl: string | undefined
) => {
  updatePolicy?.({
    ...newPolicy,
    inputs: newPolicy.inputs.map((input) => {
      if (input.type === CLOUDBEAT_AWS) {
        return {
          ...input,
          config: { cloud_formation_template_url: { value: templateUrl } },
        };
      }
      return input;
    }),
  });
};

const useCloudFormationTemplate = ({
  packageInfo,
  newPolicy,
  updatePolicy,
  setupFormat,
}: {
  packageInfo: PackageInfo;
  newPolicy: NewPackagePolicy;
  updatePolicy: (policy: NewPackagePolicy) => void;
  setupFormat: SetupFormat;
}) => {
  useEffect(() => {
    const policyInputCloudFormationTemplate = getAwsCloudFormationTemplate(newPolicy);

    if (setupFormat === 'manual') {
      if (!!policyInputCloudFormationTemplate) {
        updateCloudFormationPolicyTemplate(newPolicy, updatePolicy, undefined);
      }
      return;
    }
    const templateUrl = getCspmCloudFormationDefaultValue(packageInfo);

    if (templateUrl === '') return;

    if (policyInputCloudFormationTemplate === templateUrl) return;

    updateCloudFormationPolicyTemplate(newPolicy, updatePolicy, templateUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPolicy?.vars?.cloud_formation_template_url, newPolicy, packageInfo, setupFormat]);
};

export const useAwsCredentialsForm = ({
  newPolicy,
  input,
  packageInfo,
  onChange,
  setIsValid,
  updatePolicy,
}: {
  newPolicy: NewPackagePolicy;
  input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_azure' }>;
  packageInfo: PackageInfo;
  onChange: (opts: any) => void;
  setIsValid: (isValid: boolean) => void;
  updatePolicy: (updatedPolicy: NewPackagePolicy) => void;
}) => {
  const azureCredentialsType: AzureCredentialsType =
    getAzureCredentialsType(input) || DEFAULT_MANUAL_AZURE_CREDENTIALS_TYPE;

  console.log(azureCredentialsType);

  const options = getAwsCredentialsFormOptions();

  const hasCloudFormationTemplate = !!getCspmCloudFormationDefaultValue(packageInfo);

  const setupFormat = getAzureCredentialsType(input);

  const group = options[azureCredentialsType];
  const fields = getInputVarsFields(input, group.fields);
  const fieldsSnapshot = useRef({});
  const lastManualCredentialsType = useRef<string | undefined>(undefined);

  // useEffect(() => {
  //   const isInvalid = setupFormat === 'cloud_formation' && !hasCloudFormationTemplate;
  //
  //   setIsValid(!isInvalid);
  //
  //   onChange({
  //     isValid: !isInvalid,
  //     updatedPolicy: newPolicy,
  //   });
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [setupFormat, input.type]);

  const integrationLink = cspIntegrationDocsNavigation.cspm.getStartedPath;

  useCloudFormationTemplate({
    packageInfo,
    newPolicy,
    updatePolicy,
    setupFormat,
  });

  const onSetupFormatChange = (newSetupFormat: SetupFormat) => {
    if (newSetupFormat === 'arm_template') {
      fieldsSnapshot.current = Object.fromEntries(
        fields?.map((field) => [field.id, { value: field.value }])
      );

      lastManualCredentialsType.current = getAzureCredentialsType(input);

      updatePolicy(
        getPosturePolicy(newPolicy, input.type, {
          'azure.credentials.type': {
            value: 'arm_template',
            type: 'text',
          },
          ...Object.fromEntries(fields?.map((field) => [field.id, { value: undefined }])),
        })
      );
    } else {
      updatePolicy(
        getPosturePolicy(newPolicy, input.type, {
          'azure.credentials.type': {
            value: lastManualCredentialsType.current || DEFAULT_MANUAL_AZURE_CREDENTIALS_TYPE,
            type: 'text',
          },
          ...fieldsSnapshot.current,
        })
      );
    }
  };

  return {
    azureCredentialsType,
    setupFormat,
    group,
    fields,
    integrationLink,
    hasCloudFormationTemplate,
    onSetupFormatChange,
  };
};
