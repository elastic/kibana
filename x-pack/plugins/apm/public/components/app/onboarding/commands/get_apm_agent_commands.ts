/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Mustache from 'mustache';
import {
  java,
  javaVariables,
  javaLineNumbers,
  javaHighlightLang,
} from './java';
import {
  node,
  nodeVariables,
  nodeLineNumbers,
  nodeHighlightLang,
} from './node';
import {
  django,
  djangoVariables,
  djangoLineNumbers,
  djangoHighlightLang,
} from './django';
import {
  flask,
  flaskVariables,
  flaskLineNumbers,
  flaskHighlightLang,
} from './flask';
import {
  rails,
  railsVariables,
  railsLineNumbers,
  railsHighlightLang,
} from './rails';
import {
  rack,
  rackVariables,
  rackLineNumbers,
  rackHighlightLang,
} from './rack';
import { go, goVariables, goLineNumbers, goHighlightLang } from './go';
import {
  dotnet,
  dotnetVariables,
  dotnetLineNumbers,
  dotnetHighlightLang,
} from './dotnet';
import { php, phpVariables, phpLineNumbers, phpHighlightLang } from './php';
import {
  serviceNameHint,
  serviceEnvironmentHint,
  serverUrlHint,
  secretTokenHint,
  apiKeyHint,
} from './shared_hints';

const apmAgentCommandsMap: Record<string, string> = {
  java,
  node,
  django,
  flask,
  rails,
  rack,
  go,
  dotnet,
  php,
};

interface Variables {
  [key: string]: string;
}

const apmAgentVariablesMap: (
  secretToken?: string
) => Record<string, Variables> = (secretToken?: string) => ({
  java: javaVariables(secretToken),
  node: nodeVariables(secretToken),
  django: djangoVariables(secretToken),
  flask: flaskVariables(secretToken),
  rails: railsVariables(secretToken),
  rack: rackVariables(secretToken),
  go: goVariables(secretToken),
  dotnet: dotnetVariables(secretToken),
  php: phpVariables(secretToken),
});

interface LineNumbers {
  [key: string]: string | number | object;
}

const apmAgentLineNumbersMap: (
  apiKey?: string | null
) => Record<string, LineNumbers> = (apiKey?: string | null) => ({
  java: javaLineNumbers(apiKey),
  node: nodeLineNumbers(),
  django: djangoLineNumbers(),
  flask: flaskLineNumbers(),
  rails: railsLineNumbers(),
  rack: rackLineNumbers(),
  go: goLineNumbers(),
  dotnet: dotnetLineNumbers(),
  php: phpLineNumbers(),
});

const apmAgentHighlightLangMap: Record<string, string> = {
  java: javaHighlightLang,
  node: nodeHighlightLang,
  django: djangoHighlightLang,
  flask: flaskHighlightLang,
  rails: railsHighlightLang,
  rack: rackHighlightLang,
  go: goHighlightLang,
  dotnet: dotnetHighlightLang,
  php: phpHighlightLang,
};

export function getApmAgentCommands({
  variantId,
  apmServerUrl,
  secretToken,
  apiKey,
}: {
  variantId: string;
  apmServerUrl?: string;
  secretToken?: string;
  apiKey?: string | null;
}) {
  const commands = apmAgentCommandsMap[variantId];
  if (!commands) {
    return '';
  }

  return Mustache.render(commands, {
    apmServerUrl,
    secretToken,
    apiKey,
    serviceNameHint,
    serviceEnvironmentHint,
    serverUrlHint,
    secretTokenHint,
    apiKeyHint,
  });
}

export function getApmAgentVariables(variantId: string, secretToken?: string) {
  return apmAgentVariablesMap(secretToken)[variantId];
}

export function getApmAgentLineNumbers(
  variantId: string,
  apiKey?: string | null
) {
  return apmAgentLineNumbersMap(apiKey)[variantId];
}

export function getApmAgentHighlightLang(variantId: string) {
  return apmAgentHighlightLangMap[variantId];
}
