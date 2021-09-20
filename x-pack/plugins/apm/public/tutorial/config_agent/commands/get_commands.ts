/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Mustache from 'mustache';
import { java } from './java';
import { node } from './node';
import { django } from './django';
import { flask } from './flask';
import { rails } from './rails';
import { rack } from './rack';
import { go } from './go';
import { dotnet } from './dotnet';
import { php } from './php';
import { rum, rumScript } from './rum';

const commandsMap: Record<string, string> = {
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

export function getCommands({
  variantId,
  policyDetails,
}: {
  variantId: string;
  policyDetails: {
    apmServerUrl?: string;
    secretToken?: string;
  };
}) {
  const commands = commandsMap[variantId];
  if (!commands) {
    return '';
  }
  return Mustache.render(commands, policyDetails);
}
