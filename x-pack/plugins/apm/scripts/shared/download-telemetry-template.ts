/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Octokit } from '@octokit/rest';

export async function downloadTelemetryTemplate({
  githubToken,
}: {
  githubToken: string;
}) {
  const octokit = new Octokit({
    auth: githubToken,
  });
  const file = await octokit.repos.getContents({
    owner: 'elastic',
    repo: 'telemetry',
    path: 'config/templates/xpack-phone-home.json',
    mediaType: {
      format: 'application/vnd.github.VERSION.raw',
    },
  });

  if (Array.isArray(file.data)) {
    throw new Error('Expected single response, got array');
  }

  return JSON.parse(Buffer.from(file.data.content!, 'base64').toString()) as {
    index_patterns: string[];
    mappings: {
      properties: Record<string, any>;
    };
    settings: Record<string, any>;
  };
}
