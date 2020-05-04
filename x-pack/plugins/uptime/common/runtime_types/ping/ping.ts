/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { DateRangeType } from '../common';

export const HttpResponseBodyType = t.partial({
  bytes: t.number,
  content: t.string,
  content_bytes: t.number,
  hash: t.string,
});

export type HttpResponseBody = t.TypeOf<typeof HttpResponseBodyType>;

export const TlsType = t.partial({
  not_after: t.string,
  not_before: t.string,
});

export type Tls = t.TypeOf<typeof TlsType>;

export const MonitorType = t.intersection([
  t.type({
    duration: t.type({
      us: t.number,
    }),
    id: t.string,
    status: t.string,
    type: t.string,
  }),
  t.partial({
    check_group: t.string,
    ip: t.string,
    name: t.string,
    timespan: t.partial({
      gte: t.string,
      lte: t.string,
    }),
  }),
]);

export type Monitor = t.TypeOf<typeof MonitorType>;

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
        hostname: t.string,
        id: t.string,
        type: t.string,
        version: t.string,
      }),
      t.partial({
        name: t.string,
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
    error: t.intersection([
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
    ]),
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
        redirects: t.string,
        status_code: t.number,
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
      geo: t.partial({
        name: t.string,
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
    }),
  }),
]);

export type Ping = t.TypeOf<typeof PingType>;

export const PingsResponseType = t.type({
  total: t.number,
  locations: t.array(t.string),
  pings: t.array(PingType),
});

export type PingsResponse = t.TypeOf<typeof PingsResponseType>;

export const GetPingsParamsType = t.intersection([
  t.type({
    dateRange: DateRangeType,
  }),
  t.partial({
    index: t.number,
    size: t.number,
    location: t.string,
    monitorId: t.string,
    sort: t.string,
    status: t.string,
  }),
]);

export type GetPingsParams = t.TypeOf<typeof GetPingsParamsType>;
