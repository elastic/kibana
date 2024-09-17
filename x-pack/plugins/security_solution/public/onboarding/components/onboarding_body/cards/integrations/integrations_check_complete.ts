/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetPackagesResponse } from '@kbn/fleet-plugin/public';
import { EPM_PACKAGES_MANY, installationStatuses } from '@kbn/fleet-plugin/public';
import type { HttpSetup } from '@kbn/core/public';
import type { OnboardingCardCheckComplete } from '../../../../types';
import { getDummyAdditionalBadge } from './integrations_header_badges';

export const checkIntegrationsCardComplete: OnboardingCardCheckComplete = async ({
  http,
}: {
  http: HttpSetup;
}) => {
  const data = await http.get<GetPackagesResponse>(EPM_PACKAGES_MANY, {
    version: '2023-10-31',
  });
  const installed = (data?.items || []).filter(
    (pkg) =>
      pkg.status === installationStatuses.Installed ||
      pkg.status === installationStatuses.InstallFailed
  );
  return installed.length > 0;
};
