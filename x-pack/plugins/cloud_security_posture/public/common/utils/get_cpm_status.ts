/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LATEST_FINDINGS_INDEX_PATTERN,
  LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
} from '../../../common/constants';
import { CspSetupStatus, IndexDetails } from '../../../common/types';

// Cloud Posture Management Status
export const getCpmStatus = (cpmStatusData: CspSetupStatus | undefined) => {
  // if has findings in any of the integrations.
  const hasFindings =
    hasLatestFindingsIndex(cpmStatusData?.indicesDetails, LATEST_FINDINGS_INDEX_PATTERN) ||
    cpmStatusData?.kspm?.status === 'indexed' ||
    cpmStatusData?.cspm?.status === 'indexed';

  // kspm
  const hasKspmFindings =
    cpmStatusData?.kspm?.status === 'indexed' ||
    hasLatestFindingsIndex(cpmStatusData?.indicesDetails, LATEST_FINDINGS_INDEX_PATTERN);

  // cspm
  const hasCspmFindings =
    cpmStatusData?.cspm?.status === 'indexed' ||
    hasLatestFindingsIndex(cpmStatusData?.indicesDetails, LATEST_FINDINGS_INDEX_PATTERN);

  const hasVulnMgmtFindings =
    cpmStatusData?.vuln_mgmt?.status === 'indexed' ||
    hasLatestFindingsIndex(cpmStatusData?.indicesDetails, LATEST_VULNERABILITIES_INDEX_DEFAULT_NS);

  const isKspmInstalled = cpmStatusData?.kspm?.status !== 'not-installed';
  const isCspmInstalled = cpmStatusData?.cspm?.status !== 'not-installed';
  const isVulnMgmtInstalled = cpmStatusData?.vuln_mgmt?.status !== 'not-installed';

  const isKspmPrivileged = cpmStatusData?.kspm?.status !== 'unprivileged';
  const isCspmPrivileged = cpmStatusData?.cspm?.status !== 'unprivileged';

  const canInstallCspmIntegration = isCspmInstalled && isCspmPrivileged;
  const canInstallKspmIntegration = isKspmInstalled && isKspmPrivileged;

  const isLatestFindingsIndexEmpty =
    !isKspmInstalled &&
    !isCspmInstalled &&
    !hasLatestFindingsIndex(cpmStatusData?.indicesDetails, LATEST_FINDINGS_INDEX_PATTERN);

  const isVulnMgmtFindingsIndexEmpty =
    !isVulnMgmtInstalled &&
    !hasLatestFindingsIndex(cpmStatusData?.indicesDetails, LATEST_VULNERABILITIES_INDEX_DEFAULT_NS);

  return {
    hasFindings,
    hasKspmFindings,
    hasCspmFindings,
    hasVulnMgmtFindings,
    isCspmInstalled,
    isKspmInstalled,
    isVulnMgmtInstalled,
    isKspmPrivileged,
    isCspmPrivileged,
    canInstallCspmIntegration,
    canInstallKspmIntegration,
    isLatestFindingsIndexEmpty,
    isVulnMgmtFindingsIndexEmpty,
  };
};

const hasLatestFindingsIndex = (
  indexDetails: IndexDetails[] | undefined,
  latestIndexTemplate: string
): boolean => {
  return indexDetails
    ? indexDetails.some(
        (indexTemplate) =>
          indexTemplate?.index === latestIndexTemplate && indexTemplate?.status !== 'empty'
      )
    : false;
};
