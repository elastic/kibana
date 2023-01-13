/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { mappingFromFieldMap } from './mapping_from_field_map';
import { FieldMap } from './types';
import { alertFieldMap } from './alert_field_map';

describe('mappingFromFieldMap', () => {
  const fieldMap: FieldMap = {
    date_field: {
      type: 'date',
      array: false,
      required: true,
    },
    keyword_field: {
      type: 'keyword',
      array: false,
      required: false,
      ignore_above: 1024,
    },
    long_field: {
      type: 'long',
      array: false,
      required: false,
    },
    multifield_field: {
      type: 'keyword',
      array: false,
      required: false,
      ignore_above: 1024,
      multi_fields: [
        {
          flat_name: 'multifield_field.text',
          name: 'text',
          type: 'match_only_text',
        },
      ],
    },
    geopoint_field: {
      type: 'geo_point',
      array: false,
      required: false,
    },
    ip_field: {
      type: 'ip',
      array: false,
      required: false,
    },
    array_field: {
      type: 'keyword',
      array: true,
      required: false,
      ignore_above: 1024,
    },
    nested_array_field: {
      type: 'nested',
      array: false,
      required: false,
    },
    'nested_array_field.field1': {
      type: 'keyword',
      array: false,
      required: false,
      ignore_above: 1024,
    },
    'nested_array_field.field2': {
      type: 'keyword',
      array: false,
      required: false,
      ignore_above: 1024,
    },
    scaled_float_field: {
      type: 'scaled_float',
      array: false,
      required: false,
      scaling_factor: 1000,
    },
    constant_keyword_field: {
      type: 'constant_keyword',
      array: false,
      required: false,
    },
    'parent_field.child1': {
      type: 'keyword',
      array: false,
      required: false,
      ignore_above: 1024,
    },
    'parent_field.child2': {
      type: 'keyword',
      array: false,
      required: false,
      ignore_above: 1024,
    },
    unmapped_object: {
      type: 'object',
      required: false,
      enabled: false,
    },
    formatted_field: {
      type: 'date_range',
      required: false,
      format: 'epoch_millis||strict_date_optional_time',
    },
  };
  const expectedMapping = {
    properties: {
      array_field: {
        ignore_above: 1024,
        type: 'keyword',
      },
      constant_keyword_field: {
        type: 'constant_keyword',
      },
      date_field: {
        type: 'date',
      },
      geopoint_field: {
        type: 'geo_point',
      },
      ip_field: {
        type: 'ip',
      },
      keyword_field: {
        ignore_above: 1024,
        type: 'keyword',
      },
      long_field: {
        type: 'long',
      },
      multifield_field: {
        fields: {
          text: {
            type: 'match_only_text',
          },
        },
        ignore_above: 1024,
        type: 'keyword',
      },
      nested_array_field: {
        properties: {
          field1: {
            ignore_above: 1024,
            type: 'keyword',
          },
          field2: {
            ignore_above: 1024,
            type: 'keyword',
          },
        },
        type: 'nested',
      },
      parent_field: {
        properties: {
          child1: {
            ignore_above: 1024,
            type: 'keyword',
          },
          child2: {
            ignore_above: 1024,
            type: 'keyword',
          },
        },
      },
      scaled_float_field: {
        scaling_factor: 1000,
        type: 'scaled_float',
      },
      unmapped_object: {
        enabled: false,
        type: 'object',
      },
      formatted_field: {
        type: 'date_range',
        format: 'epoch_millis||strict_date_optional_time',
      },
    },
  };
  it('correctly creates mapping from field map', () => {
    expect(mappingFromFieldMap(fieldMap)).toEqual({ dynamic: 'strict', ...expectedMapping });
    expect(mappingFromFieldMap(alertFieldMap)).toEqual({
      dynamic: 'strict',
      properties: {
        '@timestamp': {
          type: 'date',
        },
        kibana: {
          properties: {
            alert: {
              properties: {
                action_group: {
                  type: 'keyword',
                },
                duration: {
                  properties: {
                    us: {
                      type: 'long',
                    },
                  },
                },
                end: {
                  type: 'date',
                },
                flapping: {
                  type: 'boolean',
                },
                flapping_history: {
                  type: 'boolean',
                },
                id: {
                  type: 'keyword',
                },
                reason: {
                  type: 'keyword',
                },
                rule: {
                  properties: {
                    category: {
                      type: 'keyword',
                    },
                    consumer: {
                      type: 'keyword',
                    },
                    execution: {
                      properties: {
                        uuid: {
                          type: 'keyword',
                        },
                      },
                    },
                    name: {
                      type: 'keyword',
                    },
                    parameters: {
                      type: 'object',
                      enabled: false,
                    },
                    producer: {
                      type: 'keyword',
                    },
                    rule_type_id: {
                      type: 'keyword',
                    },
                    tags: {
                      type: 'keyword',
                    },
                    uuid: {
                      type: 'keyword',
                    },
                  },
                },
                start: {
                  type: 'date',
                },
                status: {
                  type: 'keyword',
                },
                time_range: {
                  type: 'date_range',
                  format: 'epoch_millis||strict_date_optional_time',
                },
                uuid: {
                  type: 'keyword',
                },
                workflow_status: {
                  type: 'keyword',
                },
              },
            },
            space_ids: {
              type: 'keyword',
            },
            version: {
              type: 'version',
            },
          },
        },
      },
    });
  });

  it('uses dynamic setting if specified', () => {
    expect(mappingFromFieldMap(fieldMap, true)).toEqual({ dynamic: true, ...expectedMapping });
  });
});
