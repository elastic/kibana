/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import semverParse from 'semver/functions/parse';

export const POLICY_ELASTIC_AGENT_ON_CLOUD = 'policy-elastic-agent-on-cloud';

export const SUPPORTED_APM_PACKAGE_VERSION = '8.1.0';

export function isPrereleaseVersion(version: string) {
  return semverParse(version)?.prerelease?.length ?? 0 > 0;
}

export const ELASTIC_CLOUD_APM_AGENT_POLICY_ID = 'elastic-cloud-apm';
