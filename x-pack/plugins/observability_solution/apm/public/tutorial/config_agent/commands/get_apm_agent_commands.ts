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
import { rum, rumHighlightLang, rumLineNumbers, rumScript, rumVariables } from './rum';

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
  js: rum,
  js_script: rumScript,
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
  js: rumVariables,
};

interface LineNumbers {
  [key: string]: string | number | object;
}

const apmAgentLineNumbersMap: Record<string, LineNumbers> = {
  java: javaLineNumbers,
  node: nodeLineNumbers,
  django: djangoLineNumbers,
  flask: flaskLineNumbers,
  rails: railsLineNumbers,
  rack: rackLineNumbers,
  go: goLineNumbers,
  dotnet: dotnetLineNumbers,
  php: phpLineNumbers,
  js: rumLineNumbers,
};

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
  js: rumHighlightLang,
};

export function getApmAgentCommands({
  variantId,
  policyDetails,
  defaultValues,
}: {
  variantId: string;
  policyDetails: {
    apmServerUrl?: string;
    secretToken?: string;
  };
  defaultValues: {
    apmServiceName: string;
    apmEnvironment: string;
  };
}) {
  const commands = apmAgentCommandsMap[variantId];
  if (!commands) {
    return '';
  }

  return Mustache.render(commands, { ...policyDetails, ...defaultValues });
}

export function getApmAgentVariables(variantId: string) {
  return apmAgentVariablesMap[variantId];
}

export function getApmAgentLineNumbers(variantId: string) {
  return apmAgentLineNumbersMap[variantId];
}

export function getApmAgentHighlightLang(variantId: string) {
  return apmAgentHighlightLangMap[variantId];
}
