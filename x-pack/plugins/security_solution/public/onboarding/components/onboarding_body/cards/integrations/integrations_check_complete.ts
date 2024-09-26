/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetPackagesResponse } from '@kbn/fleet-plugin/public';
import { EPM_PACKAGES_MANY, installationStatuses } from '@kbn/fleet-plugin/public';
import type { HttpSetup, NavigateToAppOptions } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { lastValueFrom } from 'rxjs';
import type { OnboardingCardCheckComplete } from '../../../../types';
import { getCompleteBadgeWithTooltip } from './integrations_header_badges';

export const checkIntegrationsCardComplete: OnboardingCardCheckComplete = async ({
  data,
  http,
  navigateToApp,
}: {
  data: DataPublicPluginStart;
  http: HttpSetup;
  navigateToApp: (appId: string, options?: NavigateToAppOptions | undefined) => Promise<void>;
}) => {
  const packageData = await http.get<GetPackagesResponse>(EPM_PACKAGES_MANY, {
    version: '2023-10-31',
  });

  const agentsAvailable = await lastValueFrom(
    data.search.search({
      params: { index: `logs-elastic_agent*`, body: { size: 1 } },
    })
  );

  const installed = packageData?.items?.filter(
    (pkg) =>
      pkg.status === installationStatuses.Installed ||
      pkg.status === installationStatuses.InstallFailed
  );
  const isComplete = installed && installed.length > 0;
  const agentStillRequired =
    isComplete &&
    agentsAvailable?.rawResponse?.hits?.total != null &&
    agentsAvailable?.rawResponse?.hits?.total === 0;

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
    };
  }

  return {
    isComplete,
    completeBadgeText,
    metadata: {
      integrationsInstalled: installed.length,
      agentStillRequired,
    },
  };
};
