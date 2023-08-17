/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type {
  CloudFormationProps,
  CloudSecurityIntegrationAwsAccountType,
} from '../components/agent_enrollment_flyout/types';

import { useKibanaVersion } from './use_kibana_version';
import { useGetSettings } from './use_request';

const CLOUD_FORMATION_DEFAULT_ACCOUNT_TYPE = 'single-account';

export const useCreateCloudFormationUrl = ({
  enrollmentAPIKey,
  cloudFormationProps,
}: {
  enrollmentAPIKey: string | undefined;
  cloudFormationProps: CloudFormationProps | undefined;
}) => {
  const { data, isLoading } = useGetSettings();

  const kibanaVersion = useKibanaVersion();

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
    enrollmentAPIKey && fleetServerHost && cloudFormationProps?.templateUrl
      ? createCloudFormationUrl(
          cloudFormationProps?.templateUrl,
          enrollmentAPIKey,
          fleetServerHost,
          kibanaVersion,
          cloudFormationProps?.awsAccountType
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
  awsAccountType: CloudSecurityIntegrationAwsAccountType | undefined
) => {
  let cloudFormationUrl;

  cloudFormationUrl = templateURL
    .replace('FLEET_ENROLLMENT_TOKEN', enrollmentToken)
    .replace('FLEET_URL', fleetUrl)
    .replace('KIBANA_VERSION', kibanaVersion);

  if (cloudFormationUrl.includes('ACCOUNT_TYPE')) {
    cloudFormationUrl = cloudFormationUrl.replace(
      'ACCOUNT_TYPE',
      getAwsAccountType(awsAccountType)
    );
  }

  return new URL(cloudFormationUrl).toString();
};

const getAwsAccountType = (awsAccountType: CloudSecurityIntegrationAwsAccountType | undefined) => {
  return awsAccountType ? awsAccountType : CLOUD_FORMATION_DEFAULT_ACCOUNT_TYPE;
};
