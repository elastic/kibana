/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semver from 'semver';
import type { PrebuiltRuleVersionInfo } from '../../../../../../common/detection_engine/prebuilt_rules/poc/content_model/prebuilt_rule_version_info';

export interface GetVersionBucketsArgs {
  latestVersions: PrebuiltRuleVersionInfo[];
  installedVersions: PrebuiltRuleVersionInfo[];
}

export interface VersionBuckets {
  latestVersions: PrebuiltRuleVersionInfo[];
  installedVersions: PrebuiltRuleVersionInfo[];
  latestVersionsToInstall: PrebuiltRuleVersionInfo[];
  latestVersionsToUpgrade: PrebuiltRuleVersionInfo[];
  installedVersionsToUpgrade: PrebuiltRuleVersionInfo[];
}

export const getVersionBuckets = (args: GetVersionBucketsArgs): VersionBuckets => {
  const { latestVersions, installedVersions } = args;

  const installedVersionsMap = new Map(installedVersions.map((item) => [item.rule_id, item]));

  const latestVersionsToInstall: PrebuiltRuleVersionInfo[] = [];
  const latestVersionsToUpgrade: PrebuiltRuleVersionInfo[] = [];
  const installedVersionsToUpgrade: PrebuiltRuleVersionInfo[] = [];

  latestVersions.forEach((latestVersion) => {
    const installedVersion = installedVersionsMap.get(latestVersion.rule_id);

    if (installedVersion == null) {
      // If this rule is not installed
      latestVersionsToInstall.push(latestVersion);
    }

    if (
      installedVersion != null &&
      semver.lt(installedVersion.rule_content_version, latestVersion.rule_content_version)
    ) {
      // If this rule is installed but outdated
      latestVersionsToUpgrade.push(latestVersion);
      installedVersionsToUpgrade.push(installedVersion);
    }
  });

  return {
    latestVersions,
    installedVersions,
    latestVersionsToInstall,
    latestVersionsToUpgrade,
    installedVersionsToUpgrade,
  };
};
