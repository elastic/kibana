/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSdkNameAndLanguage, getIngestionPath } from '@kbn/elastic-agent-utils';

export interface DashboardDimensionProps {
  agentName: string;
  telemetrySdkName?: string;
  telemetrySdkLanguage?: string;
  runtimeVersion?: string;
}

export interface DashboardDimensions {
  dataFormat: string;
  sdkName: string;
  language: string;
  version?: string;
}

const standardizeLanguageName = (languageName?: string) =>
  languageName ? languageName.toLowerCase().replace('/', '_') : undefined;

export const parseMajorVersion = (runtimeVersion?: string): string | undefined => {
  if (!runtimeVersion) {
    return undefined;
  }

  const major = runtimeVersion.split('.')[0];
  const parsed = Number(major);

  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return String(parsed);
};

export const getDashboardDimensions = ({
  agentName,
  telemetrySdkName,
  telemetrySdkLanguage,
  runtimeVersion,
}: DashboardDimensionProps): DashboardDimensions | undefined => {
  const dataFormat = getIngestionPath(!!(telemetrySdkName ?? telemetrySdkLanguage));
  const { sdkName, language } = getSdkNameAndLanguage(agentName);
  const sdkLanguage = standardizeLanguageName(language);

  if (!sdkName || !sdkLanguage) {
    return undefined;
  }

  return { dataFormat, sdkName, language: sdkLanguage, version: parseMajorVersion(runtimeVersion) };
};
