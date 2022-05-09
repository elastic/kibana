/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * These are mappings of custom properties that are not part of ECS.
 * Must not interfere with standard ECS fields and field sets.
 */
exports.EcsCustomPropertyMappings = {
  kibana: {
    properties: {
      // kibana server uuid
      server_uuid: {
        type: 'keyword',
        ignore_above: 1024,
      },
      // task specific fields
      task: {
        properties: {
          id: {
            type: 'keyword',
          },
          scheduled: {
            type: 'date',
          },
          schedule_delay: {
            type: 'long',
          },
        },
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
      alert: {
        properties: {
          rule: {
            properties: {
              consumer: {
                type: 'keyword',
                ignore_above: 1024,
              },
              execution: {
                properties: {
                  uuid: {
                    type: 'keyword',
                    ignore_above: 1024,
                  },
                  status: {
                    type: 'keyword',
                    ignore_above: 1024,
                  },
                  status_order: {
                    type: 'long',
                  },
                  metrics: {
                    properties: {
                      number_of_triggered_actions: {
                        type: 'long',
                      },
                      number_of_generated_actions: {
                        type: 'long',
                      },
                      number_of_new_alerts: {
                        type: 'long',
                      },
                      number_of_active_alerts: {
                        type: 'long',
                      },
                      number_of_recovered_alerts: {
                        type: 'long',
                      },
                      total_number_of_alerts: {
                        type: 'long',
                      },
                      number_of_searches: {
                        type: 'long',
                      },
                      total_indexing_duration_ms: {
                        type: 'long',
                      },
                      es_search_duration_ms: {
                        type: 'long',
                      },
                      total_search_duration_ms: {
                        type: 'long',
                      },
                      execution_gap_duration_s: {
                        type: 'long',
                      },
                    },
                  },
                },
              },
              rule_type_id: {
                type: 'keyword',
                ignore_above: 1024,
              },
            },
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
          type_id: {
            type: 'keyword',
            ignore_above: 1024,
          },
        },
      },
      space_ids: {
        type: 'keyword',
        ignore_above: 1024,
      },
      version: {
        type: 'version',
      },
    },
  },
};

/**
 * These properties will be added to the generated event schema.
 * Here you can specify single fields (log.level) and whole field sets (event).
 */
exports.EcsPropertiesToGenerate = [
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

/**
 * These properties can have multiple values (are arrays in the generated event schema).
 */
exports.EcsEventLogMultiValuedProperties = [
  'tags',
  'event.category',
  'event.type',
  'rule.author',
  'kibana.space_ids',
];
