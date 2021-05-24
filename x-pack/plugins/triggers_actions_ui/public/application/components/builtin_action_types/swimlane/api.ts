/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export async function getApplication({
  signal,
  url,
  appId,
  apiToken,
}: {
  signal: AbortSignal;
  url: string;
  appId: string;
  apiToken: string;
}): Promise<Record<string, any>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Private-Token': `${apiToken}`,
  };

  const urlWithoutTrailingSlash = url.endsWith('/') ? url.slice(0, -1) : url;
  const apiUrl = urlWithoutTrailingSlash.endsWith('api')
    ? urlWithoutTrailingSlash
    : urlWithoutTrailingSlash + '/api';
  const applicationUrl = `${apiUrl}/app/{appId}`;

  const getApplicationUrl = (id: string) => applicationUrl.replace('{appId}', id);
  try {
    const response = await window.fetch(getApplicationUrl(appId), {
      method: 'GET',
      headers,
      signal,
    });

    if (!response.ok) {
      throw new Error(
        `Received status: ${response.status} when attempting to get application with id: ${appId}`
      );
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Unable to get application with id ${appId}. Error: ${error.message}`);
  }
}
