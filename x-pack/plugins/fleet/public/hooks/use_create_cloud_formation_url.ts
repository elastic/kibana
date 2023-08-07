/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { PackagePolicy, PackagePolicyInput } from '../../common';

import { useKibanaVersion } from './use_kibana_version';
import { useGetSettings } from './use_request';

type AwsAccountType = 'single_account' | 'organization_account';

const CLOUDBEAT_AWS = 'cloudbeat/cis_aws';

const getAwsAccountType = (input?: PackagePolicyInput): AwsAccountType | undefined =>
  input?.streams[0].vars?.['aws.account_type']?.value;

export const useCreateCloudFormationUrl = ({
  enrollmentAPIKey,
  cloudFormationTemplateUrl,
  packagePolicy,
}: {
  enrollmentAPIKey: string | undefined;
  cloudFormationTemplateUrl: string;
  packagePolicy?: PackagePolicy;
}) => {
  const { data, isLoading } = useGetSettings();

  const kibanaVersion = useKibanaVersion();

  const awsInput = packagePolicy?.inputs?.find((input) => input.type === CLOUDBEAT_AWS);
  const awsAccountType = getAwsAccountType(awsInput) || '';

  let isError = false;
  let error: string | undefined;

  // Default fleet server host
  const fleetServerHost = data?.item.fleet_server_hosts?.[0];

  if (!fleetServerHost && !isLoading) {
    isError = true;
    error = i18n.translate('xpack.fleet.agentEnrollment.cloudFormation.noFleetServerHost', {
      defaultMessage: 'No Fleet Server host found',
    });
  }

  if (!enrollmentAPIKey && !isLoading) {
    isError = true;
    error = i18n.translate('xpack.fleet.agentEnrollment.cloudFormation.noApiKey', {
      defaultMessage: 'No enrollment token found',
    });
  }

  const cloudFormationUrl =
    enrollmentAPIKey && fleetServerHost && cloudFormationTemplateUrl
      ? createCloudFormationUrl(
          cloudFormationTemplateUrl,
          enrollmentAPIKey,
          fleetServerHost,
          kibanaVersion,
          awsAccountType
        )
      : undefined;

  return {
    isLoading,
    cloudFormationUrl,
    isError,
    error,
  };
};

const createCloudFormationUrl = (
  templateURL: string,
  enrollmentToken: string,
  fleetUrl: string,
  kibanaVersion: string,
  awsAccountType: string
) => {
  let cloudFormationUrl;

  cloudFormationUrl = templateURL
    .replace('FLEET_ENROLLMENT_TOKEN', enrollmentToken)
    .replace('FLEET_URL', fleetUrl)
    .replace('KIBANA_VERSION', kibanaVersion);

  if (cloudFormationUrl.includes('ACCOUNT_TYPE')) {
    cloudFormationUrl = cloudFormationUrl.replace('ACCOUNT_TYPE', awsAccountType);
  }

  return new URL(cloudFormationUrl).toString();
};
