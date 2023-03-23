/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import fetch from 'node-fetch';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';

const bucketUrl =
  'https://8f83orp5pc.execute-api.eu-west-1.amazonaws.com/test/0_0_1';

export interface ElasticAgentLatestVersion {
  latest_version: string;
}

export interface OtelAgentLatestVersion {
  sdk_latest_version: string;
  auto_latest_version?: string;
}

export const fetchAgentsLatestVersion = async (): Promise<
  Record<AgentName, ElasticAgentLatestVersion | OtelAgentLatestVersion>
> => {
  const response = await fetch(bucketUrl);

  const releases = await response.json();
  console.log(JSON.stringify(releases));

  return releases;
};
