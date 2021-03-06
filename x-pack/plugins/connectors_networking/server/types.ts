/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { getUrlInfo, UrlInfo } from './lib/url_info';

export const PLUGIN_ID = 'connectors_networking';

export const ValidProtocols = new Set(['http', 'https', 'smtp']);

export interface PluginSetupContract {
  getClient(): ConnectorsNetworkingClient;
}

export interface PluginStartContract {
  getClient(): ConnectorsNetworkingClient;
}

export type ConnectorID = string;

export interface ConnectorsNetworkingClient {
  findForUrl(url: string): Promise<ConnectorOptionsWithId | undefined>;
}

export interface ConnectorsNetworkingHttpClient {
  create(connectorOptions: ConnectorOptions): Promise<ConnectorOptionsWithId>;
  find(): Promise<ConnectorOptionsWithId[]>;
  findForUrl(url: string): Promise<ConnectorOptionsWithId | undefined>;
  get(id: string): Promise<ConnectorOptionsWithId>;
  update(id: string, connectorOptions: ConnectorOptions): Promise<ConnectorOptionsWithId>;
  delete(id: string): Promise<void>;
}

type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };

// types and config-schema describing networking options
export type ConnectorOptionsReadOnly = TypeOf<typeof ConnectorOptionsSchema>;
export type ConnectorOptions = DeepWriteable<ConnectorOptionsReadOnly>;

export interface ConnectorOptionsWithId extends ConnectorOptions {
  id: string;
}

export interface ConnectorOptionsWithId extends ConnectorOptions {
  id: string;
}

export const ConnectorOptionsSchema = schema.object(
  {
    // human provided name
    name: schema.string({ minLength: 1 }),

    // only protocol, host, and port; only http, https, smtp protocols
    url: schema.string({ minLength: 1 }),

    // from https://nodejs.org/dist/latest-v14.x/docs/api/http.html#http_http_request_options_callback
    timeout: schema.nullable(schema.number({ min: 0 })),

    // smtp specific properties
    smtp: schema.nullable(
      schema.object({
        // below from https://nodemailer.com/smtp/
        ignore_tls: schema.nullable(schema.boolean()),
        require_tls: schema.nullable(schema.boolean()),
      })
    ),

    // tls specific properties
    tls: schema.nullable(
      schema.object({
        // below from https://nodejs.org/dist/latest-v14.x/docs/api/tls.html#
        reject_unauthorized: schema.nullable(schema.boolean()),
        min_dh_size: schema.nullable(schema.number({ min: 0 })),
        // below from https://nodejs.org/dist/latest-v14.x/docs/api/tls.html#tls_tls_createsecurecontext_options
        ca: schema.nullable(schema.string({ minLength: 1 })),
        sig_algs: schema.nullable(schema.string({ minLength: 1 })),
        ciphers: schema.nullable(schema.string({ minLength: 1 })),
        dh_param: schema.nullable(schema.string({ minLength: 1 })),
        ecdh_curve: schema.nullable(schema.string({ minLength: 1 })),
        max_version: schema.nullable(schema.string({ minLength: 1 })),
        min_version: schema.nullable(schema.string({ minLength: 1 })),
      })
    ),
  },
  { validate: validateConnectorOptions }
);

function validateConnectorOptions(connectorOptions: unknown): string | undefined {
  const co = connectorOptions as ConnectorOptions;
  let urlInfo: UrlInfo;
  try {
    urlInfo = getUrlInfo(co.url);
  } catch (err) {
    return err.message;
  }

  const { protocol } = urlInfo;

  if (protocol === 'http' && co.tls) {
    return 'tls properties cannot be provided for protocol http';
  }

  if (protocol !== 'smtp' && co.smtp) {
    return 'smtp properties can only be provided for protocol smtp';
  }
}
