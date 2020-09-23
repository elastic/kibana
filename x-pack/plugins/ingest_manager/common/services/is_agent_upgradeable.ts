/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import semver from 'semver';

export function isAgentUpgradeable({
  agentVersion,
  kibanaVersion,
}: {
  agentVersion: string;
  kibanaVersion: string;
}) {
  const kibanaVersionParsed = semver.parse(kibanaVersion);
  const agentVersionParsed = semver.parse(agentVersion);
  if (!agentVersionParsed || !kibanaVersionParsed) throw new Error('version cannot be parsed');
  return semver.lt(agentVersionParsed, kibanaVersionParsed);
}
