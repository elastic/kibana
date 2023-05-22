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

const apmAgentVariablesMap: Record<string, Variables> = {
  java: javaVariables,
  node: nodeVariables,
  django: djangoVariables,
  flask: flaskVariables,
  rails: railsVariables,
  rack: rackVariables,
  go: goVariables,
  dotnet: dotnetVariables,
  php: phpVariables,
};

interface LineNumbers {
  [key: string]: string | number | object;
}

const apmAgentLineNumbersMap: (
  apiKey?: string
) => Record<string, LineNumbers> = (apiKey?: string) => ({
  java: javaLineNumbers(apiKey),
  node: nodeLineNumbers(apiKey),
  django: djangoLineNumbers(apiKey),
  flask: flaskLineNumbers(apiKey),
  rails: railsLineNumbers(apiKey),
  rack: rackLineNumbers(apiKey),
  go: goLineNumbers(apiKey),
  dotnet: dotnetLineNumbers(apiKey),
  php: phpLineNumbers(apiKey),
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
  defaultValues,
}: {
  variantId: string;
  apmServerUrl?: string;
  secretToken?: string;
  apiKey?: string;
  defaultValues: {
    apmServiceName: string;
    apmEnvironment: string;
  };
}) {
  const commands = apmAgentCommandsMap[variantId];
  if (!commands) {
    return '';
  }

  return Mustache.render(commands, {
    apmServerUrl,
    secretToken,
    apiKey,
    ...defaultValues,
  });
}

export function getApmAgentVariables(variantId: string) {
  return apmAgentVariablesMap[variantId];
}

export function getApmAgentLineNumbers(variantId: string, apiKey?: string) {
  return apmAgentLineNumbersMap(apiKey)[variantId];
}

export function getApmAgentHighlightLang(variantId: string) {
  return apmAgentHighlightLangMap[variantId];
}
