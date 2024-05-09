/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { NewPackagePolicy, PackageInfo } from '@kbn/fleet-plugin/common';
import { AZURE_CREDENTIALS_TYPE, AZURE_SETUP_FORMAT, SetupFormat } from './azure_credentials_form';
import { cspIntegrationDocsNavigation } from '../../../common/navigation/constants';
import {
  getArmTemplateUrlFromCspmPackage,
  getPosturePolicy,
  NewPackagePolicyPostureInput,
} from '../utils';
import {
  getAzureCredentialsFormOptions,
  getInputVarsFields,
} from './get_azure_credentials_form_options';
import { CLOUDBEAT_AZURE } from '../../../../common/constants';
import { AzureCredentialsType } from '../../../../common/types_old';

const getSetupFormatFromInput = (
  input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_azure' }>,
  hasArmTemplateUrl: boolean
): SetupFormat => {
  const credentialsType = getAzureCredentialsType(input);
  if (!credentialsType && hasArmTemplateUrl) {
    return AZURE_SETUP_FORMAT.ARM_TEMPLATE;
  }
  if (credentialsType !== AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE) {
    return AZURE_SETUP_FORMAT.MANUAL;
  }

  return AZURE_SETUP_FORMAT.ARM_TEMPLATE;
};

const getAzureCredentialsType = (
  input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_azure' }>
): AzureCredentialsType | undefined => input.streams[0].vars?.['azure.credentials.type']?.value;

const getAzureArmTemplateUrl = (newPolicy: NewPackagePolicy) => {
  const template: string | undefined = newPolicy?.inputs?.find((i) => i.type === CLOUDBEAT_AZURE)
    ?.config?.arm_template_url?.value;

  return template || undefined;
};

const updateAzureArmTemplateUrlInPolicy = (
  newPolicy: NewPackagePolicy,
  updatePolicy: (policy: NewPackagePolicy) => void,
  templateUrl: string | undefined
) => {
  updatePolicy?.({
    ...newPolicy,
    inputs: newPolicy.inputs.map((input) => {
      if (input.type === CLOUDBEAT_AZURE) {
        return {
          ...input,
          config: { arm_template_url: { value: templateUrl } },
        };
      }
      return input;
    }),
  });
};

const useUpdateAzureArmTemplate = ({
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
    const azureArmTemplateUrl = getAzureArmTemplateUrl(newPolicy);

    if (setupFormat === AZURE_SETUP_FORMAT.MANUAL) {
      if (!!azureArmTemplateUrl) {
        updateAzureArmTemplateUrlInPolicy(newPolicy, updatePolicy, undefined);
      }
      return;
    }
    const templateUrl = getArmTemplateUrlFromCspmPackage(packageInfo);

    if (templateUrl === '') return;

    if (azureArmTemplateUrl === templateUrl) return;

    updateAzureArmTemplateUrlInPolicy(newPolicy, updatePolicy, templateUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPolicy?.vars?.arm_template_url, newPolicy, packageInfo, setupFormat]);
};

export const useAzureCredentialsForm = ({
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
    getAzureCredentialsType(input) || AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE;

  const options = getAzureCredentialsFormOptions();

  const hasArmTemplateUrl = !!getArmTemplateUrlFromCspmPackage(packageInfo);

  const setupFormat = getSetupFormatFromInput(input, hasArmTemplateUrl);

  const group = options[azureCredentialsType];
  const fields = getInputVarsFields(input, group.fields);
  const fieldsSnapshot = useRef({});
  const lastManualCredentialsType = useRef<string | undefined>(undefined);

  useEffect(() => {
    const isInvalid = setupFormat === AZURE_SETUP_FORMAT.ARM_TEMPLATE && !hasArmTemplateUrl;
    setIsValid(!isInvalid);

    onChange({
      isValid: !isInvalid,
      updatedPolicy: newPolicy,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupFormat, input.type]);

  const integrationLink = cspIntegrationDocsNavigation.cspm.getStartedPath;

  useUpdateAzureArmTemplate({
    packageInfo,
    newPolicy,
    updatePolicy,
    setupFormat,
  });

  const defaultAzureManualCredentialType = AZURE_CREDENTIALS_TYPE.MANAGED_IDENTITY;

  const onSetupFormatChange = (newSetupFormat: SetupFormat) => {
    if (newSetupFormat === AZURE_SETUP_FORMAT.ARM_TEMPLATE) {
      fieldsSnapshot.current = Object.fromEntries(
        fields?.map((field) => [field.id, { value: field.value }])
      );

      lastManualCredentialsType.current = getAzureCredentialsType(input);

      updatePolicy(
        getPosturePolicy(newPolicy, input.type, {
          'azure.credentials.type': {
            value: AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE,
            type: 'text',
          },
          ...Object.fromEntries(fields?.map((field) => [field.id, { value: undefined }])),
        })
      );
    } else {
      updatePolicy(
        getPosturePolicy(newPolicy, input.type, {
          'azure.credentials.type': {
            value: lastManualCredentialsType.current || defaultAzureManualCredentialType,
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
    hasArmTemplateUrl,
    onSetupFormatChange,
  };
};
