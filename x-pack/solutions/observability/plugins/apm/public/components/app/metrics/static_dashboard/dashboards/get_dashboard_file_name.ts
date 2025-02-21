/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isElasticAgentName,
  isOpenTelemetryAgentName,
} from '@kbn/elastic-agent-utils/src/agent_guards';

interface DashboardFileNamePartsProps {
  agentName?: string;
  telemetrySdkName?: string;
}

interface SdkNameAndLanguage {
  sdkName?: 'apm' | 'edot' | 'otel_other';
  language?: string;
}

export interface DashboardFileParts extends SdkNameAndLanguage {
  dataFormat: 'otel_native' | 'classic_apm';
}

// We use the language name in the filename so we want to have a valid filename
// Example swift/iOS -> swift_ios : lowercased and '/' is replaces by '_'
const standardizeLanguageName = (languageName?: string) =>
  languageName ? languageName.toLowerCase().replace('/', '_') : undefined;

const getSdkNameAndLanguage = (agentName: string): SdkNameAndLanguage => {
  const LANGUAGE_INDEX = 1;
  if (isElasticAgentName(agentName)) {
    return { sdkName: 'apm', language: standardizeLanguageName(agentName) };
  }
  const agentNameParts = agentName.split('/');

  if (isOpenTelemetryAgentName(agentName)) {
    if (agentNameParts[agentNameParts.length - 1] === 'elastic') {
      return { sdkName: 'edot', language: standardizeLanguageName(agentNameParts[LANGUAGE_INDEX]) };
    }
    return {
      sdkName: 'otel_other',
      language: standardizeLanguageName(agentNameParts[LANGUAGE_INDEX]),
    };
  }

  return { sdkName: undefined, language: undefined };
};

export const getDashboardFileName = ({
  agentName,
  telemetrySdkName,
}: DashboardFileNamePartsProps): string | undefined => {
  if (!agentName) {
    throw new Error(`agent name is not defined`);
  }
  const dataFormat = telemetrySdkName ? 'otel_native' : 'classic_apm';
  const { sdkName, language } = getSdkNameAndLanguage(agentName);
  if (!dataFormat || !sdkName || !language) {
    return undefined;
  }
  return `${dataFormat}-${sdkName}-${language}`;
};

export async function loadDashboardFile(filename: string): Promise<any> {
  return import(
    /* webpackChunkName: "lazyNodeJsDashboard" */
    `./${filename}.json`
  );
}
