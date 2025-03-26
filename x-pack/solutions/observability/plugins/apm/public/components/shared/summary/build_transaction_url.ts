/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import url from 'url';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';

export const buildUrl = (transaction: Transaction) => {
  const urlFull = transaction.url?.full || transaction.transaction?.page?.url;
  // URL fields from Otel
  const urlScheme = transaction.url?.scheme;
  const urlPath = transaction.url?.path;
  const serverAddress = transaction?.server?.address;
  const serverPort = transaction?.server?.port;

  const hasURLFromFields = urlFull && urlScheme && urlPath && serverAddress && serverPort;

  return hasURLFromFields
    ? url.format({
        protocol: urlScheme, // 'https',
        hostname: serverAddress, // 'example.com',
        port: serverPort, // 443,
        pathname: urlPath, // '/some/path',
      })
    : urlFull;
};
