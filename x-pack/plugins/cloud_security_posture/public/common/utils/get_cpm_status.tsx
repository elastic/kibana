/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Cloud Posture Management Status
export const getCpmStatus = (cpmStatusData: any) => {
  // if has findings in any of the integrations.
  const hasFindings =
    cpmStatusData.data?.indicesDetails[0].status === 'not-empty' ||
    cpmStatusData.data?.kspm.status === 'indexed' ||
    cpmStatusData.data?.cspm.status === 'indexed';

  // kspm
  const hasKspmFindings =
    cpmStatusData.data?.kspm?.status === 'indexed' ||
    cpmStatusData.data?.indicesDetails[0].status === 'not-empty';

  // cspm
  const hasCspmFindings =
    cpmStatusData.data?.cspm?.status === 'indexed' ||
    cpmStatusData.data?.indicesDetails[0].status === 'not-empty';

  const isKspmInstalled = cpmStatusData.data?.kspm?.status !== 'not-installed';
  const isCspmInstalled = cpmStatusData.data?.cspm?.status !== 'not-installed';
  const isKspmPrivileged = cpmStatusData.data?.kspm?.status !== 'unprivileged';
  const isCspmPrivileged = cpmStatusData.data?.cspm?.status !== 'unprivileged';

  const isCspmIntegrationInstalled = isCspmInstalled && isCspmPrivileged;
  const isKspmIntegrationInstalled = isKspmInstalled && isKspmPrivileged;

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
  };
};
