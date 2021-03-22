/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

exports.EcsKibanaExtensionsMappings = {
  properties: {
    // kibana server uuid
    server_uuid: {
      type: 'keyword',
      ignore_above: 1024,
    },
    // alerting specific fields
    alerting: {
      properties: {
        instance_id: {
          type: 'keyword',
          ignore_above: 1024,
        },
        action_group_id: {
          type: 'keyword',
          ignore_above: 1024,
        },
        action_subgroup: {
          type: 'keyword',
          ignore_above: 1024,
        },
        status: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
    // fields specific to Detection Engine of Elastic Security app (x-pack/plugins/security_solution)
    detection_engine: {
      properties: {
        rule_status: {
          type: 'keyword',
          ignore_above: 1024,
        },
        rule_status_severity: {
          type: 'integer',
        },
      },
    },
    // array of saved object references, for "linking" via search
    saved_objects: {
      type: 'nested',
      properties: {
        // relation; currently only supports "primary" or not set
        rel: {
          type: 'keyword',
          ignore_above: 1024,
        },
        // relevant kibana space
        namespace: {
          type: 'keyword',
          ignore_above: 1024,
        },
        id: {
          type: 'keyword',
          ignore_above: 1024,
        },
        type: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
  },
};

// ECS and Kibana ECS extension properties to generate
exports.EcsEventLogProperties = [
  '@timestamp',
  'message',
  'tags',
  'ecs',
  'error',
  'event',
  'log.level',
  'log.logger',
  'rule',
  'user.name',
  'kibana',
];

// properties that can have multiple values (array vs single value)
exports.EcsEventLogMultiValuedProperties = ['tags', 'event.category', 'event.type', 'rule.author'];
