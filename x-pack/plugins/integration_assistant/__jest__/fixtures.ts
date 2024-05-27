/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const ecsMappingMockedRequest = {
  rawSamples: [
    '{ "timestamp": "2020-10-19 19:31:31", "id": 0, "class": "general", "event": "status"}',
    '{ "timestamp": "2020-10-19 19:32:10", "id": 0, "class": "connection", "event": "disconnect", "connection_id": 16, "account": { "user": "audit_test_user2", "host": "hades.home" }}',
  ],
  packageName: 'mysql_enterprise',
  dataStreamName: 'audit',
};

export const ecsMappingExpectedResults = {
  mapping: {
    mysql_enterprise: {
      audit: {
        timestamp: {
          target: '@timestamp',
          confidence: 0.99,
          type: 'date',
          date_formats: ['yyyy-MM-dd HH:mm:ss'],
        },
        id: null,
        class: null,
        connection_id: null,
        account: {
          user: {
            target: 'user.name',
            type: 'string',
            date_formats: [],
            confidence: 1,
          },
          host: {
            target: 'source.domain',
            type: 'string',
            date_formats: [],
            confidence: 1,
          },
        },
        event: {
          target: 'event.action',
          confidence: 0.8,
          type: 'string',
          date_formats: [],
        },
      },
    },
  },
  pipeline: {
    description: 'Pipeline to process mysql_enterprise audit logs',
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
          target_field: 'mysql_enterprise.audit',
        },
      },
      {
        date: {
          field: 'mysql_enterprise.audit.timestamp',
          target_field: '@timestamp',
          formats: ['yyyy-MM-dd HH:mm:ss'],
          if: 'ctx.mysql_enterprise?.audit?.timestamp != null',
        },
      },
      {
        rename: {
          field: 'mysql_enterprise.audit.account.user',
          target_field: 'user.name',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'mysql_enterprise.audit.account.host',
          target_field: 'source.domain',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'mysql_enterprise.audit.event',
          target_field: 'event.action',
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
        rename: {
          field: 'destination.as.organization_name',
          tag: 'rename_destination_as_organization_name',
          target_field: 'destination.as.organization.name',
          ignore_missing: true,
        },
      },
      {
        remove: {
          field: null,
          ignore_missing: true,
          tag: 'remove_fields',
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
};

export const ecsInitialMappingMockedResponse = {
  mysql_enterprise: {
    audit: {
      timestamp: {
        target: 'event.action',
        confidence: 0.99,
        type: 'string',
        date_formats: ['yyyy-MM-dd HH:mm:ss'],
      },
      id: null,
      class: null,
      connection_id: null,
      account: {
        user: {
          target: 'user.name',
          type: 'string',
          date_formats: [],
          confidence: 1.0,
        },
        host: {
          target: 'source.domain',
          type: 'string',
          date_formats: [],
          confidence: 1.0,
        },
      },
      event: {
        target: 'event.action',
        confidence: 0.8,
        type: 'string',
        date_formats: [],
      },
    },
  },
};

export const ecsDuplicateMockedResponse = {
  mysql_enterprise: {
    audit: {
      timestamp: {
        target: '@timestamp',
        confidence: 0.99,
        type: 'date',
        date_formats: ['yyyy-MM-dd HH:mm:ss'],
      },
      id: null,
      connection_id: null,
      account: {
        user: {
          target: 'user.name',
          type: 'string',
          date_formats: [],
          confidence: 1.0,
        },
        host: {
          target: 'source.domain',
          type: 'string',
          date_formats: [],
          confidence: 1.0,
        },
      },
      event: {
        target: 'event.action',
        confidence: 0.8,
        type: 'string',
        date_formats: [],
      },
    },
  },
};

export const ecsMissingKeysMockedResponse = {
  mysql_enterprise: {
    audit: {
      timestamp: {
        target: '@timestamp',
        confidence: 0.99,
        type: 'date',
        date_formats: ['yyyy-MM-dd HH:mm:ss'],
      },
      id: null,
      class: null,
      connection_id: null,
      account: {
        user: {
          target: 'user.name',
          type: 'string',
          date_formats: [],
          confidence: 1.0,
        },
        host: {
          target: 'source.domain',
          type: 'string',
          date_formats: [],
          confidence: 1.0,
        },
      },
      event: {
        target: 'invalid.ecs.field',
        confidence: 0.8,
        type: 'string',
        date_formats: [],
      },
    },
  },
};

export const ecsInvalidMappingMockedResponse = {
  mysql_enterprise: {
    audit: {
      timestamp: {
        target: '@timestamp',
        confidence: 0.99,
        type: 'date',
        date_formats: ['yyyy-MM-dd HH:mm:ss'],
      },
      id: null,
      class: null,
      connection_id: null,
      account: {
        user: {
          target: 'user.name',
          type: 'string',
          date_formats: [],
          confidence: 1.0,
        },
        host: {
          target: 'source.domain',
          type: 'string',
          date_formats: [],
          confidence: 1.0,
        },
      },
      event: {
        target: 'event.action',
        confidence: 0.8,
        type: 'string',
        date_formats: [],
      },
    },
  },
};
