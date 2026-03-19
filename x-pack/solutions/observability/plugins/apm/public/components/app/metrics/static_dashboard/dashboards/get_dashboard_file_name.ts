/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSdkNameAndLanguage, getIngestionPath } from '@kbn/elastic-agent-utils';

interface DashboardFileNamePartsProps {
  agentName: string;
  telemetrySdkName?: string;
  telemetrySdkLanguage?: string;
  runtimeVersion?: string;
}

const standardizeLanguageName = (languageName?: string) =>
  languageName ? languageName.toLowerCase().replace('/', '_') : undefined;

export const parseMajorVersion = (version?: string): string | undefined => {
  if (!version) {
    return undefined;
  }

  const major = version.split('.')[0];
  const parsed = Number(major);

  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return String(parsed);
};

export const getDashboardFileName = ({
  agentName,
  telemetrySdkName,
  telemetrySdkLanguage,
  runtimeVersion,
}: DashboardFileNamePartsProps): {
  versionedFileName: string | undefined;
  defaultFileName: string | undefined;
} => {
  const dataFormat = getIngestionPath(!!(telemetrySdkName ?? telemetrySdkLanguage));
  const { sdkName, language } = getSdkNameAndLanguage(agentName);
  const sdkLanguage = standardizeLanguageName(language);
  if (!sdkName || !sdkLanguage) {
    return { versionedFileName: undefined, defaultFileName: undefined };
  }

  const defaultFileName = `${dataFormat}-${sdkName}-${sdkLanguage}-default`;
  const majorVersion = parseMajorVersion(runtimeVersion);
  const versionedFileName = majorVersion
    ? `${dataFormat}-${sdkName}-${sdkLanguage}-v${majorVersion}`
    : undefined;

  return { versionedFileName, defaultFileName };
};
