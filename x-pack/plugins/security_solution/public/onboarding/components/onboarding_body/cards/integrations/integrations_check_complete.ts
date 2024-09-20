/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetPackagesResponse } from '@kbn/fleet-plugin/public';
import { EPM_PACKAGES_MANY, installationStatuses } from '@kbn/fleet-plugin/public';
import type { HttpSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { OnboardingCardCheckComplete } from '../../../../types';
// import { getDummyAdditionalBadge } from './integrations_header_badges';

export const checkIntegrationsCardComplete: OnboardingCardCheckComplete = async ({
  http,
}: {
  http: HttpSetup;
}) => {
  const data = await http.get<GetPackagesResponse>(EPM_PACKAGES_MANY, {
    version: '2023-10-31',
  });
  const installed = data?.items?.filter(
    (pkg) =>
      pkg.status === installationStatuses.Installed ||
      pkg.status === installationStatuses.InstallFailed
  );
  const isComplete = installed && installed.length > 0;

  if (!isComplete) {
    return {
      isComplete,
    };
  }

  return {
    isComplete,
    completeBadgeText: i18n.translate(
      'xpack.securitySolution.onboarding.integrationsCard.badge.completeText',
      {
        defaultMessage: '{count} {count, plural, one {integration} other {integrations}} added',
        values: { count: installed.length },
      }
    ),
    // additionalBadges: [getDummyAdditionalBadge()],
    metadata: {
      integrationsInstalled: installed.length,
    },
  };
};
