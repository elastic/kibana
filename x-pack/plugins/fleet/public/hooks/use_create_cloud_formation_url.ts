/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { useKibanaVersion } from './use_kibana_version';
import { useGetSettings } from './use_request';

export const useCreateCloudFormationUrl = ({
  enrollmentAPIKey,
  cloudFormationTemplateUrl,
}: {
  enrollmentAPIKey: string | undefined;
  cloudFormationTemplateUrl: string;
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
    enrollmentAPIKey && fleetServerHost && cloudFormationTemplateUrl
      ? createCloudFormationUrl(
          cloudFormationTemplateUrl,
          enrollmentAPIKey,
          fleetServerHost,
          kibanaVersion
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
  kibanaVersion: string
) => {
  const cloudFormationUrl = templateURL
    .replace('FLEET_ENROLLMENT_TOKEN', enrollmentToken)
    .replace('FLEET_URL', fleetUrl)
    .replace('KIBANA_VERSION', kibanaVersion);

  return new URL(cloudFormationUrl).toString();
};
