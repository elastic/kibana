/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { flatten, zip } from 'lodash';

export type ElasticAgentPlatform = 'linux-tar' | 'macos' | 'windows';

export function getElasticAgentSetupCommand({
  elasticAgentPlatform,
  apiKeyEncoded = '$API_KEY',
  apiEndpoint = '$API_ENDPOINT',
  scriptDownloadUrl = '$SCRIPT_DOWNLOAD_URL',
  elasticAgentVersion = '$ELASTIC_AGENT_VERSION',
  autoDownloadConfig = false,
  onboardingId = '$ONBOARDING_ID',
}: {
  elasticAgentPlatform: ElasticAgentPlatform;
  apiKeyEncoded: string | undefined;
  apiEndpoint: string | undefined;
  scriptDownloadUrl: string | undefined;
  elasticAgentVersion: string | undefined;
  autoDownloadConfig: boolean;
  onboardingId: string | undefined;
}) {
  const setupScriptFilename = 'standalone_agent_setup.sh';
  const LINUX_MACOS_COMMAND = oneLine`
      curl ${scriptDownloadUrl} -o ${setupScriptFilename} &&
      sudo bash ${setupScriptFilename} ${apiKeyEncoded} ${apiEndpoint} ${elasticAgentVersion} ${onboardingId} ${
    autoDownloadConfig ? `autoDownloadConfig=1` : ''
  }
    `;
  const PLATFORM_COMMAND: Record<ElasticAgentPlatform, string> = {
    'linux-tar': LINUX_MACOS_COMMAND,
    macos: LINUX_MACOS_COMMAND,
    windows: oneLine`
      curl -O https://elastic.co/agent-setup.sh &&
      sudo bash agent-setup.sh -- service.name=my-service --url=https://elasticsearch:8220 --enrollment-token=SRSc2ozWUItWXNuWE5oZzdERFU6anJtY0FIzhSRGlzeTJYcUF5UklfUQ==
    `,
  };
  return PLATFORM_COMMAND[elasticAgentPlatform];
}

function oneLine(parts: TemplateStringsArray, ...args: string[]) {
  const str = flatten(zip(parts, args)).join('');
  return str.replace(/\s+/g, ' ').trim();
}
