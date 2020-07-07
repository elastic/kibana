/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  deserializeComponentTemplate,
  serializeComponentTemplate,
} from './component_template_serialization';

describe('Component template serialization', () => {
  describe('deserializeComponentTemplate()', () => {
    test('deserializes a component template', () => {
      expect(
        deserializeComponentTemplate(
          {
            name: 'my_component_template',
            component_template: {
              version: 1,
              _meta: {
                serialization: {
                  id: 10,
                  class: 'MyComponentTemplate',
                },
                description: 'set number of shards to one',
              },
              template: {
                settings: {
                  number_of_shards: 1,
                },
                mappings: {
                  _source: {
                    enabled: false,
                  },
                  properties: {
                    host_name: {
                      type: 'keyword',
                    },
                    created_at: {
                      type: 'date',
                      format: 'EEE MMM dd HH:mm:ss Z yyyy',
                    },
                  },
                },
              },
            },
          },
          [
            {
              name: 'my_index_template',
              index_template: {
                index_patterns: ['foo'],
                template: {
                  settings: {
                    number_of_replicas: 2,
                  },
                },
                composed_of: ['my_component_template'],
              },
            },
          ]
        )
      ).toEqual({
        name: 'my_component_template',
        version: 1,
        _meta: {
          serialization: {
            id: 10,
            class: 'MyComponentTemplate',
          },
          description: 'set number of shards to one',
        },
        template: {
          settings: {
            number_of_shards: 1,
          },
          mappings: {
            _source: {
              enabled: false,
            },
            properties: {
              host_name: {
                type: 'keyword',
              },
              created_at: {
                type: 'date',
                format: 'EEE MMM dd HH:mm:ss Z yyyy',
              },
            },
          },
        },
        _kbnMeta: {
          usedBy: ['my_index_template'],
        },
      });
    });
  });

  describe('serializeComponentTemplate()', () => {
    test('serialize a component template', () => {
      expect(
        serializeComponentTemplate({
          name: 'my_component_template',
          version: 1,
          _kbnMeta: {
            usedBy: [],
          },
          _meta: {
            serialization: {
              id: 10,
              class: 'MyComponentTemplate',
            },
            description: 'set number of shards to one',
          },
          template: {
            settings: {
              number_of_shards: 1,
            },
            mappings: {
              _source: {
                enabled: false,
              },
              properties: {
                host_name: {
                  type: 'keyword',
                },
                created_at: {
                  type: 'date',
                  format: 'EEE MMM dd HH:mm:ss Z yyyy',
                },
              },
            },
          },
        })
      ).toEqual({
        version: 1,
        _meta: {
          serialization: {
            id: 10,
            class: 'MyComponentTemplate',
          },
          description: 'set number of shards to one',
        },
        template: {
          settings: {
            number_of_shards: 1,
          },
          mappings: {
            _source: {
              enabled: false,
            },
            properties: {
              host_name: {
                type: 'keyword',
              },
              created_at: {
                type: 'date',
                format: 'EEE MMM dd HH:mm:ss Z yyyy',
              },
            },
          },
        },
      });
    });
  });
});
