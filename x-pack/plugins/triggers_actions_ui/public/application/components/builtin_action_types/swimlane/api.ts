/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SwimlaneFieldMappingConfig } from './types';

const removeUnsafeFields = (fields: SwimlaneFieldMappingConfig[]): SwimlaneFieldMappingConfig[] =>
  fields.filter(
    (filter) =>
      filter.id !== '__proto__' &&
      filter.key !== '__proto__' &&
      filter.name !== '__proto__' &&
      filter.fieldType !== '__proto__'
  );
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
    const response = await fetch(getApplicationUrl(appId), {
      method: 'GET',
      headers,
      signal,
    });

    /**
     * Fetch do not throw when there is an HTTP error (status >= 400).
     * We need to do it manually.
     */

    if (!response.ok) {
      throw new Error(
        `Received status: ${response.status} when attempting to get application with id: ${appId}`
      );
    }

    const data = await response.json();
    return { ...data, fields: removeUnsafeFields(data?.fields ?? []) };
  } catch (error) {
    throw new Error(`Unable to get application with id ${appId}. Error: ${error.message}`);
  }
}
