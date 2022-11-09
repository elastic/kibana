/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Mustache from 'mustache';
import { java, javaVariables } from './java';
import { node, nodeVariables } from './node';
import { django, djangoVariables } from './django';
import { flask, flaskVariables } from './flask';
import { rails, railsVariables } from './rails';
import { rack, rackVariables } from './rack';
import { go, goVariables } from './go';
import { dotnet, dotnetVariables } from './dotnet';
import { php, phpVariables } from './php';
import { rum, rumScript, rumVariables } from './rum';

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
