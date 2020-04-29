/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const GetCertsParamsType = t.intersection([
  t.type({
    from: t.string,
    to: t.string,
    index: t.number,
    size: t.number,
  }),
  t.partial({
    search: t.string,
  }),
]);

export type GetCertsParams = t.TypeOf<typeof GetCertsParamsType>;

export const CertType = t.intersection([
  t.type({
    monitors: t.array(
      t.partial({
        name: t.string,
        id: t.string,
      })
    ),
    sha256: t.string,
  }),
  t.partial({
    certificate_not_valid_after: t.string,
    certificate_not_valid_before: t.string,
    common_name: t.string,
    issuer: t.string,
    sha1: t.string,
  }),
]);

export type Cert = t.TypeOf<typeof CertType>;
