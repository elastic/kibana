/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CspSetupStatus } from '../../../common/types';

// Cloud Posture Management Status
export const getCpmStatus = (cpmStatusData: CspSetupStatus | undefined) => {
  // if has findings in any of the integrations.
  const hasFindings =
    cpmStatusData?.indicesDetails[0].status === 'not-empty' ||
    cpmStatusData?.kspm.status === 'indexed' ||
    cpmStatusData?.cspm.status === 'indexed';

  // kspm
  const hasKspmFindings =
    cpmStatusData?.kspm?.status === 'indexed' ||
    cpmStatusData?.indicesDetails[0].status === 'not-empty';

  // cspm
  const hasCspmFindings =
    cpmStatusData?.cspm?.status === 'indexed' ||
    cpmStatusData?.indicesDetails[0].status === 'not-empty';

  const isKspmInstalled = cpmStatusData?.kspm?.status !== 'not-installed';
  const isCspmInstalled = cpmStatusData?.cspm?.status !== 'not-installed';
  const isKspmPrivileged = cpmStatusData?.kspm?.status !== 'unprivileged';
  const isCspmPrivileged = cpmStatusData?.cspm?.status !== 'unprivileged';

  const isCspmIntegrationInstalled = isCspmInstalled && isCspmPrivileged;
  const isKspmIntegrationInstalled = isKspmInstalled && isKspmPrivileged;

  const isEmptyData =
    cpmStatusData?.kspm?.status === 'not-installed' &&
    cpmStatusData?.cspm?.status === 'not-installed' &&
    cpmStatusData?.indicesDetails[0].status === 'empty';

  return {
    hasFindings,
    hasKspmFindings,
    hasCspmFindings,
    isCspmInstalled,
    isKspmInstalled,
    isKspmPrivileged,
    isCspmPrivileged,
    isCspmIntegrationInstalled,
    isKspmIntegrationInstalled,
    isEmptyData,
  };
};
