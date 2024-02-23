/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { ObserverCodec } from './observer';
import { ErrorStateCodec } from './error_state';
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
    check_group: t.string,
  }),
  t.partial({
    duration: t.type({
      us: t.number,
    }),
    ip: t.string,
    name: t.string,
    timespan: t.type({
      gte: t.string,
      lt: t.string,
    }),
    fleet_managed: t.boolean,
    project: t.type({
      id: t.string,
      name: t.string,
    }),
    origin: t.union([t.literal('ui'), t.literal('project')]),
  }),
]);

export type Monitor = t.TypeOf<typeof MonitorType>;

export const PingHeadersType = t.record(t.string, t.union([t.string, t.array(t.string)]));

export type PingHeaders = t.TypeOf<typeof PingHeadersType>;

export const AgentType = t.intersection([
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
]);

// should this be partial?
export const UrlType = t.partial({
  domain: t.string,
  full: t.string,
  port: t.number,
  scheme: t.string,
  path: t.string,
});

const SummaryCodec = t.type({
  down: t.number,
  up: t.number,
  status: t.union([t.literal('up'), t.literal('down')]),
  attempt: t.number,
  max_attempts: t.number,
  final_attempt: t.boolean,
  retry_group: t.string,
});

export type TestSummary = t.TypeOf<typeof SummaryCodec>;

export const PingType = t.intersection([
  t.type({
    timestamp: t.string,
    monitor: MonitorType,
    docId: t.string,
    observer: ObserverCodec,
  }),
  t.partial({
    '@timestamp': t.string,
    agent: AgentType,
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
    resolve: t.partial({
      ip: t.string,
      rtt: t.partial({
        us: t.number,
      }),
    }),
    summary: SummaryCodec,
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
    url: UrlType,
    service: t.partial({
      name: t.string,
    }),
    config_id: t.string,
    state: ErrorStateCodec,
    data_stream: t.interface({
      namespace: t.string,
      type: t.string,
      dataset: t.string,
    }),
  }),
]);

export const PingStateType = t.type({
  timestamp: t.string,
  '@timestamp': t.string,
  monitor: MonitorType,
  docId: t.string,
  state: ErrorStateCodec,
  error: PingErrorType,
});
export type Ping = t.TypeOf<typeof PingType>;
export type PingState = t.TypeOf<typeof PingStateType>;

export const PingStatusType = t.intersection([
  t.type({
    timestamp: t.string,
    docId: t.string,
    config_id: t.string,
    locationId: t.string,
    summary: t.partial({
      down: t.number,
      up: t.number,
    }),
  }),
  t.partial({
    error: PingErrorType,
  }),
]);

export type PingStatus = t.TypeOf<typeof PingStatusType>;

export const PingsResponseType = t.type({
  total: t.number,
  pings: t.array(PingType),
});

export type PingsResponse = t.TypeOf<typeof PingsResponseType>;

export const PingStatusesResponseType = t.type({
  total: t.number,
  pings: t.array(PingStatusType),
  from: t.string,
  to: t.string,
});

export type PingStatusesResponse = t.TypeOf<typeof PingStatusesResponseType>;

export const GetPingsParamsType = t.intersection([
  t.type({
    dateRange: DateRangeType,
  }),
  t.partial({
    excludedLocations: t.string,
    index: t.number,
    size: t.number,
    pageIndex: t.number,
    locations: t.string,
    monitorId: t.string,
    sort: t.string,
    status: t.string,
  }),
]);

export type GetPingsParams = t.TypeOf<typeof GetPingsParamsType>;
