/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

// These should be imported, but until TypeScript 4.2 we're inlining them here.
// All instances of "service.name", "service.environment", "transaction.name",
// and "transaction.type" need to be changed back to using the constants.
// See https://github.com/microsoft/TypeScript/issues/37888
// import {
//   SERVICE_NAME,
//   SERVICE_ENVIRONMENT,
//   TRANSACTION_NAME,
//   TRANSACTION_TYPE,
// } from '../../../../common/elasticsearch_fieldnames';

export interface CustomLinkES {
  id?: string;
  '@timestamp'?: number;
  label: string;
  url: string;
  'service.name'?: string[];
  'service.environment'?: string[];
  'transaction.name'?: string[];
  'transaction.type'?: string[];
}

export const filterOptionsRt = t.partial({
  'service.name': t.string,
  'service.environment': t.string,
  'transaction.name': t.string,
  'transaction.type': t.string,
});

export const payloadRt = t.intersection([
  t.type({
    label: t.string,
    url: t.string,
  }),
  t.partial({
    id: t.string,
    filters: t.array(
      t.type({
        key: t.union([t.literal(''), t.keyof(filterOptionsRt.props)]),
        value: t.string,
      })
    ),
  }),
]);
