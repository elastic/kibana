/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetPackagesResponse } from '@kbn/fleet-plugin/public';
import { EPM_API_ROUTES, installationStatuses } from '@kbn/fleet-plugin/public';
import { i18n } from '@kbn/i18n';
import { lastValueFrom } from 'rxjs';
import type { OnboardingCardCheckComplete } from '../../../../types';
import { AGENT_INDEX } from './constants';
import type { StartServices } from '../../../../../types';
import type { IntegrationCardMetadata } from './types';

export const checkIntegrationsCardComplete: OnboardingCardCheckComplete<
  IntegrationCardMetadata
> = async (services: StartServices) => {
  const packageData = await services.http
    .get<GetPackagesResponse>(EPM_API_ROUTES.INSTALL_BY_UPLOAD_PATTERN, {
      version: '2023-10-31',
    })
    .catch((err: Error) => {
      services.notifications.toasts.addError(err, {
        title: i18n.translate(
          'xpack.securitySolution.onboarding.integrationsCard.checkComplete.fetchIntegrations.errorTitle',
          {
            defaultMessage: 'Error fetching integrations data',
          }
        ),
      });
      return { items: [] };
    });

  const agentsData = await lastValueFrom(
    services.data.search.search({
      params: { index: AGENT_INDEX, body: { size: 1 } },
    })
  ).catch((err: Error) => {
    services.notifications.toasts.addError(err, {
      title: i18n.translate(
        'xpack.securitySolution.onboarding.integrationsCard.checkComplete.fetchAgents.errorTitle',
        {
          defaultMessage: 'Error fetching agents data',
        }
      ),
    });
    return { rawResponse: { hits: { total: 0 } } };
  });

  const installed = packageData?.items?.filter(
    (pkg) =>
      pkg.status === installationStatuses.Installed ||
      pkg.status === installationStatuses.InstallFailed
  );
  const isComplete = installed && installed.length > 0;
  const agentsDataAvailable = !!agentsData?.rawResponse?.hits?.total;
  const isAgentRequired = isComplete && !agentsDataAvailable;

  const completeBadgeText = i18n.translate(
    'xpack.securitySolution.onboarding.integrationsCard.badge.completeText',
    {
      defaultMessage: '{count} {count, plural, one {integration} other {integrations}} added',
      values: { count: installed.length },
    }
  );

  if (!isComplete) {
    return {
      isComplete,
      metadata: {
        installedIntegrationsCount: 0,
        isAgentRequired: false,
      },
    };
  }

  return {
    isComplete,
    completeBadgeText,
    metadata: {
      installedIntegrationsCount: installed.length,
      isAgentRequired,
    },
  };
};
