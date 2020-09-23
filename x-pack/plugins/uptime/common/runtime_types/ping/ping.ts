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
    timespan: t.type({
      gte: t.string,
      lt: t.string,
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
        redirects: t.array(t.string),
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

export const SyntheticsType = t.intersection([
  t.type({
    index: t.number,
    journey: t.type({
      id: t.string,
      name: t.string,
    }),
    package_version: t.string,
    step: t.type({
      index: t.number,
      name: t.string,
    }),
    type: t.string,
  }),
  t.partial({
    blob: t.string,
    payload: t.partial({
      duration: t.number,
      error: t.partial({
        message: t.string,
        name: t.string,
        stack: t.string,
      }),
      index: t.number,
      is_navigation_request: t.boolean,
      message: t.string,
      method: t.string,
      name: t.string,
      params: t.partial({
        homepage: t.string,
      }),
      request: t.partial({
        has_post_data: t.boolean,
        headers: t.partial({
          accept: t.string,
          accept_encoding: t.string,
          access_control_request_headers: t.string,
          access_control_request_method: t.string,
          authority: t.string,
          content_encoding: t.string,
          content_type: t.string,
          cookie: t.string,
          if_none_match: t.string,
          method: t.string,
          origin: t.string,
          path: t.string,
          range: t.string,
          referer: t.string,
          scheme: t.string,
          sec_fetch_dest: t.string,
          sec_fetch_mode: t.string,
          sec_fetch_site: t.string,
          sec_fetch_user: t.string,
          traceparent: t.string,
          upgrade_insecure_requests: t.string,
          user_agent: t.string,
        }),
        initial_priority: t.string,
        is_link_preload: t.string,
        method: t.string,
        mixed_content_type: t.string,
        post_data: t.string,
        post_data_entries: t.partial({
          bytes: t.string,
        }),
        referrer_policy: t.string,
        url: t.string,
      }),
      response: t.partial({
        connection_id: t.number,
        connection_reused: t.boolean,
        encoded_data_length: t.number,
        from_disk_cache: t.boolean,
        from_prefetch_cache: t.boolean,
        from_service_worker: t.boolean,
        headers: t.partial({
          accept_ranges: t.string,
          access_control_allow_credentials: t.string,
          access_control_allow_headers: t.string,
          access_control_allow_methods: t.string,
          access_control_allow_origin: t.string,
          access_control_expose_headers: t.string,
          access_control_max_age: t.string,
          age: t.string,
          alt_svc: t.string,
          an_x_request_uuid: t.string,
          cache_control: t.string,
          cached: t.string,
          cf_bgj: t.string,
          cf_cache_status: t.string,
          cf_polished: t.string,
          cf_ray: t.string,
          cf_request_id: t.string,
          connection: t.string,
          content_disposition: t.string,
          content_encoding: t.string,
          content_length: t.string,
          content_range: t.string,
          content_security_policy: t.string,
          content_type: t.string,
          date: t.string,
          e_tag: t.string,
          edge_control: t.string,
          etag: t.string,
          expect_ct: t.string,
          expires: t.string,
          fastly_io_error: t.string,
          fastly_io_info: t.string,
          fastly_io_warning: t.string,
          fastly_stats: t.string,
          last_modified: t.string,
          p3p: t.string,
          pragma: t.string,
          server: t.string,
          server_timing: t.string,
          set_cookie: t.string,
          status: t.string,
          strict_transport_security: t.string,
          timing_allow_origin: t.string,
          transfer_encoding: t.string,
          vary: t.string,
          via: t.string,
          x_account_id: t.string,
          x_amz_cf_id: t.string,
          x_amz_cf_pop: t.string,
          x_amz_id_2: t.string,
          x_amz_meta_pci_enabled: t.string,
          x_amz_meta_revision: t.string,
          x_amz_replication_status: t.string,
          x_amz_request_id: t.string,
          x_amz_server_side_encryption: t.string,
          x_amz_version_id: t.string,
          x_api_version: t.string,
          x_cache: t.string,
          x_cache_hits: t.string,
          x_cdn: t.string,
          x_cloud_request_id: t.string,
          x_content_type_options: t.string,
          x_contentstack_organization: t.string,
          x_cs_surrogate_key: t.string,
          x_dns_prefetch_control: t.string,
          x_download_options: t.string,
          x_fb_debug: t.string,
          x_fb_trip_id: t.string,
          x_found_handling_cluster: t.string,
          x_found_handling_instance: t.string,
          x_frame_options: t.string,
          x_msedge_ref: t.string,
          x_powered_by: t.string,
          x_proxy_origin: t.string,
          x_q_stat: t.string,
          x_request_id: t.string,
          x_runtime: t.string,
          x_served_by: t.string,
          x_timer: t.string,
          x_xss_protection: t.string,
        }),
        mime_type: t.string,
        protocol: t.string,
        remote_i_p_address: t.string,
        remote_port: t.string,
        request_headers: t.partial({
          accept: t.string,
          accept_encoding: t.string,
          authority: t.string,
          cookie: t.string,
          method: t.string,
          path: t.string,
          referer: t.string,
          scheme: t.string,
          sec_fetch_dest: t.string,
          sec_fetch_mode: t.string,
          sec_fetch_site: t.string,
          sec_fetch_user: t.string,
          upgrade_insecure_requests: t.string,
          user_agent: t.string,
        }),
        response_time: t.number,
        security_details: t.partial({
          certificate_id: t.string,
          certificate_transparency_compliance: t.string,
          cipher: t.string,
          issuer: t.string,
          key_exchange: t.string,
          key_exchange_group: t.string,
          protocol: t.string,
          san_list: t.string,
          subject_name: t.string,
          valid_from: t.string,
          valid_to: t.string,
        }),
        security_state: t.string,
        status: t.number,
        status_text: t.string,
        timing: t.partial({
          connect_end: t.string,
          connect_start: t.string,
          dns_end: t.string,
          dns_start: t.string,
          proxy_end: t.string,
          proxy_start: t.string,
          push_end: t.string,
          push_start: t.string,
          receive_headers_end: t.string,
          request_time: t.string,
          send_end: t.string,
          send_start: t.string,
          ssl_end: t.string,
          ssl_start: t.string,
          worker_fetch_start: t.string,
          worker_ready: t.string,
          worker_respond_with_settled: t.string,
          worker_start: t.string,
        }),
        url: t.string,
      }),
      source: t.string,
      start: t.number,
      status: t.string,
      ts: t.number,
      type: t.string,
      url: t.string,
      end: t.number,
    }),
  }),
  // ui-related fields
  t.partial({
    screenshotLoading: t.boolean,
  }),
]);

export const SyntheticsPingType = t.intersection([
  PingType,
  t.partial({
    synthetics: SyntheticsType,
  }),
]);

export type SyntheticsPing = t.TypeOf<typeof SyntheticsPingType>;

export const SyntheticsJourneyApiResponseType = t.type({
  checkGroup: t.string,
  steps: t.array(SyntheticsPingType),
});

export type SyntheticsJourneyApiResponse = t.TypeOf<typeof SyntheticsJourneyApiResponseType>;

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
