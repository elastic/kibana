/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
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

const getSdkNameAndLanguage = (agentNameParts: string[]): SdkNameAndLanguage => {
  const LANGUAGE_INDEX = 1;
  if (agentNameParts.length === 1) {
    return { sdkName: 'apm', language: agentNameParts[0] };
  }
  if (agentNameParts[0].toLocaleLowerCase() === 'opentelemetry') {
    if (agentNameParts[agentNameParts.length - 1] === 'elastic') {
      return { sdkName: 'edot', language: agentNameParts[LANGUAGE_INDEX] };
    }
    return { sdkName: 'otel_other', language: agentNameParts[LANGUAGE_INDEX] };
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
  const agentNameParts = agentName.split('/');
  const { sdkName, language } = getSdkNameAndLanguage(agentNameParts);
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
