/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import fetch from 'node-fetch';
import { ErrorWithStatusCode } from './error_with_status_code';

export const fetchWithTimeout = async (
  url: string,
  options: { timeout?: number } = {}
) => {
  const { timeout = 5000 } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(url, {
    ...options,
    signal: controller.signal,
  });
  clearTimeout(id);

  if (response.status !== 200) {
    throw new ErrorWithStatusCode(
      `${response.status} - ${await response.text()}`,
      `${response.status}`
    );
  }

  return await response.json();
};
