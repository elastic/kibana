/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

<<<<<<< HEAD
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
=======
import { useKibanaVersion } from './use_kibana_version';
import { useGetSettings } from './use_request';

export const useCreateCloudFormationUrl = ({
  enrollmentAPIKey,
  cloudFormationTemplateUrl,
}: {
  enrollmentAPIKey: string | undefined;
  cloudFormationTemplateUrl: string;
>>>>>>> whats-new
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
<<<<<<< HEAD
    enrollmentAPIKey && fleetServerHost && cloudFormationProps?.templateUrl
      ? createCloudFormationUrl(
          cloudFormationProps?.templateUrl,
          enrollmentAPIKey,
          fleetServerHost,
          kibanaVersion,
          cloudFormationProps?.awsAccountType
=======
    enrollmentAPIKey && fleetServerHost && cloudFormationTemplateUrl
      ? createCloudFormationUrl(
          cloudFormationTemplateUrl,
          enrollmentAPIKey,
          fleetServerHost,
          kibanaVersion
>>>>>>> whats-new
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
<<<<<<< HEAD
  kibanaVersion: string,
  awsAccountType: CloudSecurityIntegrationAwsAccountType | undefined
) => {
  let cloudFormationUrl;

  cloudFormationUrl = templateURL
=======
  kibanaVersion: string
) => {
  const cloudFormationUrl = templateURL
>>>>>>> whats-new
    .replace('FLEET_ENROLLMENT_TOKEN', enrollmentToken)
    .replace('FLEET_URL', fleetUrl)
    .replace('KIBANA_VERSION', kibanaVersion);

<<<<<<< HEAD
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
=======
  return new URL(cloudFormationUrl).toString();
};
>>>>>>> whats-new
