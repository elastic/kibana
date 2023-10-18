/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { AzureArmTemplateProps } from '../components/agent_enrollment_flyout/types';

import { useGetSettings } from './use_request';

export const useCreateAzureArmTemplateUrl = ({
  enrollmentAPIKey,
  azureArmTemplateProps,
}: {
  enrollmentAPIKey: string | undefined;
  azureArmTemplateProps: AzureArmTemplateProps | undefined;
}) => {
  const { data, isLoading } = useGetSettings();

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

  const azureArmTemplateUrl = azureArmTemplateProps?.templateUrl;

  return {
    isLoading,
    azureArmTemplateUrl,
    isError,
    error,
  };
};
