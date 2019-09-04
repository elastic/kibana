/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

exports.EcsKibanaExtensionsMappings = {
  properties: {
    // kibana server uuid
    server_uuid: {
      type: 'keyword',
      ignore_above: 1024,
    },
    // relevant kibana space
    namespace: {
      type: 'keyword',
      ignore_above: 1024,
    },
    // array of saved object references, for "linking" via search
    saved_objects: {
      type: 'nested',
      properties: {
        // 'kibana' for typical saved object, 'task_manager' for TM, etc
        store: {
          type: 'keyword',
          ignore_above: 1024
        },
        id: {
          type: 'keyword',
          ignore_above: 1024
        },
        type: {
          type: 'keyword',
          ignore_above: 1024
        }
      }
    }
  }
};

// ECS and Kibana ECS extension properties to generate
exports.EcsEventLogProperties = [
  '@timestamp',
  'tags',
  'message',
  'ecs.version',
  'event.action',
  'event.provider',
  'event.start',
  'event.duration',
  'event.end',
  'user.name',
  'kibana.server_uuid',
  'kibana.namespace',
  'kibana.saved_objects.store',
  'kibana.saved_objects.id',
  'kibana.saved_objects.name',
  'kibana.saved_objects.type',
];

// properties that can have multiple values (array vs single value)
exports.EcsEventLogMultiValuedProperties = [
  'tags',
];
