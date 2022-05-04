/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { DateRangeType } from '../common';
import { SyntheticsDataType } from './synthetics';

// IO type for validation
export const PingErrorType = t.intersection([
  t.partial({
    code: t.string,
    id: t.string,
    stack_trace: t.string,
    type: t.string,
  }),
  t.type({
    // this is _always_ on the error field
    message: t.string,
  }),
]);

// Typescript type for type checking
export type PingError = t.TypeOf<typeof PingErrorType>;

export const MonitorDetailsType = t.intersection([
  t.type({ monitorId: t.string }),
  t.partial({ error: PingErrorType, timestamp: t.string, alerts: t.unknown }),
]);
export type MonitorDetails = t.TypeOf<typeof MonitorDetailsType>;

export const HttpResponseBodyType = t.partial({
  bytes: t.number,
  content: t.string,
  content_bytes: t.number,
  hash: t.string,
});

export type HttpResponseBody = t.TypeOf<typeof HttpResponseBodyType>;

const ECSDistinguishedName = t.type({
  common_name: t.string,
  distinguished_name: t.string,
});

export const X509ExpiryType = t.type({
  not_after: t.string,
  not_before: t.string,
});

export type X509Expiry = t.TypeOf<typeof X509ExpiryType>;

export const X509Type = t.intersection([
  t.type({
    issuer: ECSDistinguishedName,
    subject: ECSDistinguishedName,
    serial_number: t.string,
    public_key_algorithm: t.string,
    signature_algorithm: t.string,
  }),
  X509ExpiryType,
  t.partial({
    public_key_curve: t.string,
    public_key_exponent: t.number,
    public_key_size: t.number,
  }),
]);

export type X509 = t.TypeOf<typeof X509Type>;

export const TlsType = t.partial({
  // deprecated in favor of server.x509.not_after/not_before
  certificate_not_valid_after: t.string,
  certificate_not_valid_before: t.string,
  cipher: t.string,
  established: t.boolean,
  server: t.partial({
    hash: t.type({
      sha256: t.string,
      sha1: t.string,
    }),
    x509: X509Type,
  }),
});

export type Tls = t.TypeOf<typeof TlsType>;

export const MonitorType = t.intersection([
  t.type({
    id: t.string,
    status: t.string,
    type: t.string,
  }),
  t.partial({
    duration: t.type({
      us: t.number,
    }),
    check_group: t.string,
    ip: t.string,
    name: t.string,
    timespan: t.type({
      gte: t.string,
      lt: t.string,
    }),
  }),
]);

export type Monitor = t.TypeOf<typeof MonitorType>;

export const PingHeadersType = t.record(t.string, t.union([t.string, t.array(t.string)]));

export type PingHeaders = t.TypeOf<typeof PingHeadersType>;

export const PingType = t.intersection([
  t.type({
    timestamp: t.string,
    monitor: MonitorType,
    docId: t.string,
  }),
  t.partial({
    agent: t.intersection([
      t.type({
        ephemeral_id: t.string,
        id: t.string,
        type: t.string,
        version: t.string,
      }),
      t.partial({
        name: t.string,
        hostname: t.string,
      }),
    ]),
    container: t.partial({
      id: t.string,
      image: t.partial({
        name: t.string,
        tag: t.string,
      }),
      name: t.string,
      runtime: t.string,
    }),
    ecs: t.partial({
      version: t.string,
    }),
    error: PingErrorType,
    http: t.partial({
      request: t.partial({
        body: t.partial({
          bytes: t.number,
          content: t.partial({
            text: t.string,
          }),
        }),
        bytes: t.number,
        method: t.string,
        referrer: t.string,
      }),
      response: t.partial({
        body: HttpResponseBodyType,
        bytes: t.number,
        redirects: t.array(t.string),
        status_code: t.number,
        headers: PingHeadersType,
      }),
      version: t.string,
    }),
    icmp: t.partial({
      requests: t.number,
      rtt: t.partial({
        us: t.number,
      }),
    }),
    kubernetes: t.partial({
      pod: t.partial({
        name: t.string,
        uid: t.string,
      }),
    }),
    observer: t.partial({
      hostname: t.string,
      ip: t.array(t.string),
      mac: t.array(t.string),
      geo: t.partial({
        name: t.string,
        continent_name: t.string,
        city_name: t.string,
        country_iso_code: t.string,
        location: t.union([
          t.string,
          t.partial({ lat: t.number, lon: t.number }),
          t.partial({ lat: t.string, lon: t.string }),
        ]),
      }),
    }),
    resolve: t.partial({
      ip: t.string,
      rtt: t.partial({
        us: t.number,
      }),
    }),
    summary: t.partial({
      down: t.number,
      up: t.number,
    }),
    synthetics: SyntheticsDataType,
    tags: t.array(t.string),
    tcp: t.partial({
      rtt: t.partial({
        connect: t.partial({
          us: t.number,
        }),
      }),
    }),
    tls: TlsType,
    // should this be partial?
    url: t.partial({
      domain: t.string,
      full: t.string,
      port: t.number,
      scheme: t.string,
      path: t.string,
    }),
    service: t.partial({
      name: t.string,
    }),
    config_id: t.string,
    data_stream: t.interface({
      namespace: t.string,
      type: t.string,
      dataset: t.string,
    }),
  }),
]);

export type Ping = t.TypeOf<typeof PingType>;

// Convenience function for tests etc that makes an empty ping
// object with the minimum of fields.
export const makePing = (f: {
  docId?: string;
  type?: string;
  id?: string;
  timestamp?: string;
  ip?: string;
  status?: string;
  duration?: number;
  location?: string;
  name?: string;
  url?: string;
}): Ping => {
  return {
    docId: f.docId || 'myDocId',
    timestamp: f.timestamp || '2020-07-07T01:14:08Z',
    monitor: {
      id: f.id || 'myId',
      type: f.type || 'myType',
      ip: f.ip || '127.0.0.1',
      status: f.status || 'up',
      duration: { us: f.duration || 100000 },
      name: f.name,
    },
    ...(f.location ? { observer: { geo: { name: f.location } } } : {}),
    ...(f.url ? { url: { full: f.url } } : {}),
  };
};

export const PingsResponseType = t.type({
  total: t.number,
  pings: t.array(PingType),
});

export type PingsResponse = t.TypeOf<typeof PingsResponseType>;

export const GetPingsParamsType = t.intersection([
  t.type({
    dateRange: DateRangeType,
  }),
  t.partial({
    excludedLocations: t.string,
    index: t.number,
    size: t.number,
    locations: t.string,
    monitorId: t.string,
    sort: t.string,
    status: t.string,
  }),
]);

export type GetPingsParams = t.TypeOf<typeof GetPingsParamsType>;
