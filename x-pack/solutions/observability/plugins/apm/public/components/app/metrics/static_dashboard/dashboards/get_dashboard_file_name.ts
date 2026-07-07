/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSdkNameAndLanguage, getIngestionPath } from '@kbn/elastic-agent-utils';
import type { DashboardFileName } from './dashboard_catalog';
import { resolveDashboard } from './dashboard_catalog';

interface DashboardFileNamePartsProps {
  agentName: string;
  telemetrySdkName?: string;
  telemetrySdkLanguage?: string;
  runtimeVersion?: string;
}

// We use the language name in the filename so we want to have a valid filename
// Example swift/iOS -> swift_ios : lowercased and '/' is replaces by '_'
const standardizeLanguageName = (languageName?: string) =>
  languageName ? languageName.toLowerCase().replace('/', '_') : undefined;

export const parseMajorVersion = (version?: string): number | undefined => {
  if (!version) {
    return undefined;
  }

  const major = version.split('.')[0];
  const parsed = Number(major);

  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return parsed;
};

export const getDashboardFileName = ({
  agentName,
  telemetrySdkName,
  telemetrySdkLanguage,
  runtimeVersion,
}: DashboardFileNamePartsProps): DashboardFileName | undefined => {
  const dataFormat = getIngestionPath(!!(telemetrySdkName ?? telemetrySdkLanguage));
  const { sdkName, language } = getSdkNameAndLanguage(agentName);
  const sdkLanguage = standardizeLanguageName(language);
  if (!sdkName || !sdkLanguage) {
    return undefined;
  }

  const baseKey = `${dataFormat}-${sdkName}-${sdkLanguage}`;
  const majorVersion = parseMajorVersion(runtimeVersion);

  return resolveDashboard(baseKey, majorVersion);
};
