/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Mustache from 'mustache';
import { django, djangoHighlightLang, djangoLineNumbers, djangoVariables } from './django';
import { dotnet, dotnetHighlightLang, dotnetLineNumbers, dotnetVariables } from './dotnet';
import { flask, flaskHighlightLang, flaskLineNumbers, flaskVariables } from './flask';
import { go, goHighlightLang, goLineNumbers, goVariables } from './go';
import { java, javaHighlightLang, javaLineNumbers, javaVariables } from './java';
import { node, nodeHighlightLang, nodeLineNumbers, nodeVariables } from './node';
import { php, phpHighlightLang, phpLineNumbers, phpVariables } from './php';
import { rack, rackHighlightLang, rackLineNumbers, rackVariables } from './rack';
import { rails, railsHighlightLang, railsLineNumbers, railsVariables } from './rails';
import {
  apiKeyHint,
  secretTokenHint,
  serverUrlHint,
  serviceEnvironmentHint,
  serviceNameHint,
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

const apmAgentVariablesMap: (secretToken?: string) => Record<string, Variables> = (
  secretToken?: string
) => ({
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

const apmAgentLineNumbersMap: (apiKey?: string | null) => Record<string, LineNumbers> = (
  apiKey?: string | null
) => ({
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

export function getApmAgentLineNumbers(variantId: string, apiKey?: string | null) {
  return apmAgentLineNumbersMap(apiKey)[variantId];
}

export function getApmAgentHighlightLang(variantId: string) {
  return apmAgentHighlightLangMap[variantId];
}
