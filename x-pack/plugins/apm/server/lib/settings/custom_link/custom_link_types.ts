/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';

export interface CustomLinkES {
  id?: string;
  '@timestamp'?: number;
  label: string;
  url: string;
  [SERVICE_NAME]?: string[];
  [SERVICE_ENVIRONMENT]?: string[];
  [TRANSACTION_NAME]?: string[];
  [TRANSACTION_TYPE]?: string[];
}

export const filterOptionsRt = t.partial({
  [SERVICE_NAME]: t.string,
  [SERVICE_ENVIRONMENT]: t.string,
  [TRANSACTION_NAME]: t.string,
  [TRANSACTION_TYPE]: t.string,
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
