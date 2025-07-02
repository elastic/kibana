/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Transaction } from '../../typings/es_schemas/ui/transaction';
import type { Span } from '../../typings/es_schemas/ui/span';
import type { APMError } from '../../typings/es_schemas/ui/apm_error';

export const buildUrl = (item: Transaction | Span | APMError) => {
  // URL fields from Otel
  const urlScheme = item?.url?.scheme;
  const urlPath = item?.url?.path;
  const serverAddress = item?.server?.address;
  const serverPort = item?.server?.port;

  const hasURLFromFields = urlScheme && serverAddress;

  const urlServerPort = serverPort ? `:${serverPort}` : '';

  try {
    const url = hasURLFromFields
      ? new URL(urlPath ?? '', `${urlScheme}://${serverAddress}${urlServerPort}`).toString()
      : undefined;

    return url;
  } catch (e) {
    console.error('Failed to build URL', e);
    return undefined;
  }
};
