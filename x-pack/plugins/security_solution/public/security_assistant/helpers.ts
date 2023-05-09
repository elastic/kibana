/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SecurityAssistantUiSettings {
  virusTotal: {
    apiKey: string;
    baseUrl: string;
  };

  openAI: {
    apiKey: string;
    baseUrl: string;
  };
}

export async function fetchVirusTotalReport({
  hash,
  settings: { virusTotal, openAI },
}: {
  hash: string;
  settings: SecurityAssistantUiSettings;
}): Promise<unknown> {
  const url = `${virusTotal.baseUrl}/files/${hash}`;

  const response = await fetch(url, {
    headers: {
      'x-apikey': virusTotal.apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`VirusTotal API request failed with status ${response.status}`);
  }

  const data = await response.json();
  return data;
}
