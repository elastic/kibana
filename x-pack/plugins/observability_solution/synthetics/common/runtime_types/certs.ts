/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const GetCertsParamsType = t.partial({
  pageIndex: t.number,
  search: t.string,
  notValidBefore: t.string,
  notValidAfter: t.string,
  from: t.string,
  to: t.string,
  sortBy: t.string,
  direction: t.string,
  size: t.number,
  filters: t.unknown,
  monitorIds: t.array(t.string),
});

export type GetCertsParams = t.TypeOf<typeof GetCertsParamsType>;

export const CertMonitorType = t.partial({
  name: t.string,
  id: t.string,
  configId: t.string,
  url: t.string,
});

export const CertType = t.intersection([
  t.type({
    monitors: t.array(CertMonitorType),
    sha256: t.string,
    configId: t.string,
  }),
  t.partial({
    not_after: t.string,
    not_before: t.string,
    common_name: t.string,
    issuer: t.string,
    sha1: t.string,
    monitorName: t.string,
    monitorType: t.string,
    monitorUrl: t.string,
    locationName: t.string,
    '@timestamp': t.string,
  }),
]);

export const CertResultType = t.type({
  certs: t.array(CertType),
  total: t.number,
});

export type Cert = t.TypeOf<typeof CertType>;
export type CertMonitor = t.TypeOf<typeof CertMonitorType>;
export type CertResult = t.TypeOf<typeof CertResultType>;
