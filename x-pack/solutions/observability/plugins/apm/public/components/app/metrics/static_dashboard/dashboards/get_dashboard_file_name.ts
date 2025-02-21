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
  agentName: string;
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
  const dataFormat = telemetrySdkName ? 'otel_native' : 'classic_apm';
  const { sdkName, language } = getSdkNameAndLanguage(agentName);
  if (!dataFormat || !sdkName || !language) {
    return undefined;
  }
  return `${dataFormat}-${sdkName}-${language}`;
};

/**
 * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
 * [request] placeholder is set for dynamic chunk name: https://webpack.js.org/api/module-methods/#webpackchunkname
 * See https://webpack.js.org/api/module-methods/#magic-comments
 */
// TODO try to use this
// export async function loadDashboardFile(filename: string) {
//   return import(
//     /* webpackChunkName: "[request]" */ Throws an error: Error: worker exitted unexpectedly with code 1 [last message: { bundleId: 'apm', type: 'running' }]
//     /* webpackMode: "lazy" */
//     `./${filename}.json`
//   );
// }

/**
 * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
 * See https://webpack.js.org/api/module-methods/#magic-comments
 */

// TODO replace when the new dashboards are ready (if possible with the above comment)
export async function loadDashboardFile(filename: string) {
  switch (filename) {
    case 'classic_apm-apm-nodejs': {
      return import(
        /* webpackChunkName: "lazyNodeJsDashboard" */
        './nodejs.json'
      );
    }
    // TODO fix
    case 'classic_apm-otel_other-nodejs': {
      return import(
        /* webpackChunkName: "lazyNodeJsDashboard" */
        './nodejs.json'
      );
    }
    case 'classic_apm-apm-java': {
      return import(
        /* webpackChunkName: "lazyJavaDashboard" */
        './java.json'
      );
    }
    case 'otel_native-otel_other-nodejs': {
      return import(
        /* webpackChunkName: "lazyNodeJsDashboard" */
        './opentelemetry_nodejs.json'
      );
    }
    case 'otel_native-otel_other-java': {
      return import(
        /* webpackChunkName: "lazyJavaDashboard" */
        './opentelemetry_java.json'
      );
    }
    case 'otel_native-otel_other-dotnet': {
      return import(
        /* webpackChunkName: "lazyOtelDotnetDashboard" */
        './opentelemetry_dotnet.json'
      );
    }
    default: {
      break;
    }
  }
}
