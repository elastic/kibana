/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';

const mavenJavaAgentUrl =
  'https://repo1.maven.org/maven2/co/elastic/apm/elastic-apm-agent/maven-metadata.xml';

const versionRegex = /<version>(\d+\.\d+\.\d+.*?)<\/version>/gm;

export async function getJavaAgentVersionsFromRegistry() {
  const response = await (await fetch(mavenJavaAgentUrl)).text();
  const matchedVersions = [...response.matchAll(versionRegex)];

  if (!matchedVersions.length) {
    return undefined;
  }
  return matchedVersions
    .map((aMatch) => aMatch[1])
    .concat(['latest'])
    .reverse();
}
