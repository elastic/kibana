/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const result = {
  pipeline: {
    description: 'Pipeline to process my_integration my_data_stream_title logs',
    processors: [
      {
        set: {
          field: 'ecs.version',
          tag: 'set_ecs_version',
          value: '8.11.0',
        },
      },
      {
        rename: {
          field: 'message',
          target_field: 'event.original',
          tag: 'rename_message',
          ignore_missing: true,
          if: 'ctx.event?.original == null',
        },
      },
      {
        remove: {
          field: 'message',
          ignore_missing: true,
          tag: 'remove_message',
          if: 'ctx.event?.original != null',
        },
      },
      {
        json: {
          field: 'event.original',
          tag: 'json_original',
          target_field: 'my_integration.my_data_stream_title',
        },
      },
      {
        rename: {
          field: 'my_integration.my_data_stream_title.event',
          target_field: 'event.action',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'my_integration.my_data_stream_title.uid',
          target_field: 'event.id',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'my_integration.my_data_stream_title.code',
          target_field: 'event.code',
          ignore_missing: true,
        },
      },
      {
        date: {
          field: 'my_integration.my_data_stream_title.time',
          target_field: '@timestamp',
          formats: ['ISO8601'],
          if: 'ctx.my_integration?.my_data_stream_title?.time != null',
        },
      },
      {
        rename: {
          field: 'my_integration.my_data_stream_title.user',
          target_field: 'user.name',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'my_integration.my_data_stream_title.user_agent',
          target_field: 'user_agent.original',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'my_integration.my_data_stream_title.addr.remote',
          target_field: 'source.address',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'my_integration.my_data_stream_title.server_hostname',
          target_field: 'destination.domain',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'my_integration.my_data_stream_title.proto',
          target_field: 'network.transport',
          ignore_missing: true,
        },
      },
      {
        script: {
          description: 'Drops null/empty values recursively.',
          tag: 'script_drop_null_empty_values',
          lang: 'painless',
          source:
            'boolean dropEmptyFields(Object object) {\n  if (object == null || object == "") {\n    return true;\n  } else if (object instanceof Map) {\n    ((Map) object).values().removeIf(value -> dropEmptyFields(value));\n    return (((Map) object).size() == 0);\n  } else if (object instanceof List) {\n    ((List) object).removeIf(value -> dropEmptyFields(value));\n    return (((List) object).length == 0);\n  }\n  return false;\n}\ndropEmptyFields(ctx);\n',
        },
      },
      {
        geoip: {
          field: 'source.ip',
          tag: 'geoip_source_ip',
          target_field: 'source.geo',
          ignore_missing: true,
        },
      },
      {
        geoip: {
          ignore_missing: true,
          database_file: 'GeoLite2-ASN.mmdb',
          field: 'source.ip',
          tag: 'geoip_source_asn',
          target_field: 'source.as',
          properties: ['asn', 'organization_name'],
        },
      },
      {
        rename: {
          field: 'source.as.asn',
          tag: 'rename_source_as_asn',
          target_field: 'source.as.number',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'source.as.organization_name',
          tag: 'rename_source_as_organization_name',
          target_field: 'source.as.organization.name',
          ignore_missing: true,
        },
      },
      {
        geoip: {
          field: 'destination.ip',
          tag: 'geoip_destination_ip',
          target_field: 'destination.geo',
          ignore_missing: true,
        },
      },
      {
        geoip: {
          database_file: 'GeoLite2-ASN.mmdb',
          field: 'destination.ip',
          tag: 'geoip_destination_asn',
          target_field: 'destination.as',
          properties: ['asn', 'organization_name'],
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'destination.as.asn',
          tag: 'rename_destination_as_asn',
          target_field: 'destination.as.number',
          ignore_missing: true,
        },
      },
      {
        append: {
          field: 'event.type',
          value: ['start'],
          allow_duplicates: false,
          if: "ctx.event?.action == 'user.login'",
        },
      },
      {
        append: {
          field: 'event.category',
          value: ['authentication'],
          allow_duplicates: false,
          if: "ctx.event?.action == 'user.login'",
        },
      },
      {
        append: {
          field: 'event.type',
          value: ['start'],
          allow_duplicates: false,
          if: "ctx.event?.action == 'session.start'",
        },
      },
      {
        append: {
          field: 'event.category',
          value: ['session'],
          allow_duplicates: false,
          if: "ctx.event?.action == 'session.start'",
        },
      },
      {
        append: {
          field: 'event.type',
          value: ['info'],
          allow_duplicates: false,
          if: 'ctx.my_integration?.my_data_stream_title?.mfa_device != null',
        },
      },
      {
        append: {
          field: 'event.category',
          value: ['authentication'],
          allow_duplicates: false,
          if: 'ctx.my_integration?.my_data_stream_title?.mfa_device != null',
        },
      },
      {
        append: {
          field: 'related.ip',
          value: ['{{{my_integration.my_data_stream_title.addr.remote}}}'],
          if: 'ctx?.my_integration?.my_data_stream_title?.addr?.remote != null',
          allow_duplicates: false,
        },
      },
      {
        append: {
          field: 'related.user',
          value: ['{{{user.name}}}'],
          allow_duplicates: false,
        },
      },
      {
        append: {
          field: 'related.hosts',
          value: ['{{{destination.domain}}}'],
          if: 'ctx?.destination?.domain != null',
          allow_duplicates: false,
        },
      },
      {
        append: {
          field: 'related.hosts',
          value: ['{{{my_integration.my_data_stream_title.server_labels.hostname}}}'],
          if: 'ctx?.my_integration?.my_data_stream_title?.server_labels?.hostname != null',
          allow_duplicates: false,
        },
      },
      {
        rename: {
          field: 'destination.as.organization_name',
          tag: 'rename_destination_as_organization_name',
          target_field: 'destination.as.organization.name',
          ignore_missing: true,
        },
      },
      {
        remove: {
          field: 'event.original',
          tag: 'remove_original_event',
          if: 'ctx?.tags == null || !(ctx.tags.contains("preserve_original_event"))',
          ignore_failure: true,
          ignore_missing: true,
        },
      },
    ],
    on_failure: [
      {
        append: {
          field: 'error.message',
          value:
            'Processor {{{_ingest.on_failure_processor_type}}} with tag {{{_ingest.on_failure_processor_tag}}} in pipeline {{{_ingest.on_failure_pipeline}}} failed with message: {{{_ingest.on_failure_message}}}',
        },
      },
      {
        set: {
          field: 'event.kind',
          value: 'pipeline_error',
        },
      },
    ],
  },
  docs: [
    {
      '@timestamp': '2024-02-23T18:56:50.628Z',
      ecs: {
        version: '8.11.0',
      },
      my_integration: {
        my_data_stream_title: {
          cluster_name: 'teleport.ericbeahan.com',
          'addr.remote': '136.61.214.196:50332',
          ei: 0,
          method: 'local',
          required_private_key_policy: 'none',
          success: true,
          time: '2024-02-23T18:56:50.628Z',
          mfa_device: {
            mfa_device_type: 'TOTP',
            mfa_device_uuid: 'd07bf388-af49-4ec2-b8a4-c8a9e785b70b',
            mfa_device_name: 'otp-device',
          },
        },
      },
      related: {
        user: ['teleport-admin'],
      },
      event: {
        action: 'user.login',
        code: 'T1000I',
        id: 'b675d102-fc25-4f7a-bf5d-96468cc176ea',
        type: ['start', 'info'],
        category: ['authentication'],
      },
      user: {
        name: 'teleport-admin',
      },
      user_agent: {
        original:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      },
      tags: [
        '_geoip_database_unavailable_GeoLite2-City.mmdb',
        '_geoip_database_unavailable_GeoLite2-ASN.mmdb',
        '_geoip_database_unavailable_GeoLite2-City.mmdb',
        '_geoip_database_unavailable_GeoLite2-ASN.mmdb',
      ],
    },
    {
      '@timestamp': '2024-02-23T18:56:57.199Z',
      ecs: {
        version: '8.11.0',
      },
      my_integration: {
        my_data_stream_title: {
          cluster_name: 'teleport.ericbeahan.com',
          'addr.remote': '136.61.214.196:50339',
          ei: 0,
          private_key_policy: 'none',
          login: 'ec2-user',
          server_id: 'face0091-2bf1-43fd-a16a-f1514b4119f4',
          sid: '293fda2d-2266-4d4d-b9d1-bd5ea9dd9fc3',
          user_kind: 1,
          server_labels: {
            'teleport.internal/resource-id': 'dccb2999-9fb8-4169-aded-ec7a1c0a26de',
            hostname: 'ip-172-31-8-163.us-east-2.compute.internal',
          },
          size: '80:25',
          namespace: 'default',
          session_recording: 'node',
          time: '2024-02-23T18:56:57.199Z',
        },
      },
      related: {
        user: ['teleport-admin'],
        hosts: ['ip-172-31-8-163.us-east-2.compute.internal'],
      },
      destination: {
        domain: 'ip-172-31-8-163.us-east-2.compute.internal',
      },
      event: {
        action: 'session.start',
        code: 'T2000I',
        id: 'fff30583-13be-49e8-b159-32952c6ea34f',
        type: ['start'],
        category: ['session'],
      },
      user: {
        name: 'teleport-admin',
      },
      network: {
        transport: 'ssh',
      },
      tags: [
        '_geoip_database_unavailable_GeoLite2-City.mmdb',
        '_geoip_database_unavailable_GeoLite2-ASN.mmdb',
        '_geoip_database_unavailable_GeoLite2-City.mmdb',
        '_geoip_database_unavailable_GeoLite2-ASN.mmdb',
      ],
    },
  ],
};
