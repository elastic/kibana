/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticAgentName, OpenTelemetryAgentName } from '@kbn/elastic-agent-utils';
import { ELASTIC_AGENT_NAMES } from '@kbn/elastic-agent-utils';
import { OPEN_TELEMETRY_BASE_AGENT_NAMES } from '@kbn/elastic-agent-utils/src/agent_names';

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

const ElasticAgentNamesSet = new Set(ELASTIC_AGENT_NAMES);
const OpenTelemetryBaseSet = new Set(OPEN_TELEMETRY_BASE_AGENT_NAMES);

const isElasticAgent = (agentName: string): agentName is ElasticAgentName => {
  return ElasticAgentNamesSet.has(agentName as ElasticAgentName) === true;
};

const isOpenTelemetry = (agentNameBase: string): agentNameBase is OpenTelemetryAgentName => {
  return OpenTelemetryBaseSet.has(agentNameBase as OpenTelemetryAgentName) === true;
};

// We use the language name in the file name so we want to have a valid filename and to lowercase it
const standardizeLanguageName = (languageName?: string) =>
  languageName ? languageName.toLowerCase().replace('/', '_') : undefined;

const getSdkNameAndLanguage = (agentName: string): SdkNameAndLanguage => {
  const LANGUAGE_INDEX = 1;
  if (isElasticAgent(agentName)) {
    return { sdkName: 'apm', language: standardizeLanguageName(agentName) };
  }
  const agentNameParts = agentName.split('/');

  if (isOpenTelemetry(agentNameParts[0].toLocaleLowerCase() as OpenTelemetryAgentName)) {
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
