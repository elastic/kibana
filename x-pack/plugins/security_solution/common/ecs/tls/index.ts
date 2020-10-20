/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface TlsEcs {
  client_certificate?: TlsClientCertificateData;

  fingerprints?: TlsFingerprintsData;

  server_certificate?: TlsServerCertificateData;
}

export interface TlsClientCertificateData {
  fingerprint?: FingerprintData;
}

export interface FingerprintData {
  sha1?: string[];
}

export interface TlsFingerprintsData {
  ja3?: TlsJa3Data;
}

export interface TlsJa3Data {
  hash?: string[];
}

export interface TlsServerCertificateData {
  fingerprint?: FingerprintData;
}
