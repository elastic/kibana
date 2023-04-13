/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getComponentTemplateFromFieldMap } from './component_template_from_field_map';
import { testFieldMap, expectedTestMapping } from './mapping_from_field_map.test';

describe('getComponentTemplateFromFieldMap', () => {
  it('correctly creates component template from field map', () => {
    expect(
      getComponentTemplateFromFieldMap({ name: 'test-mappings', fieldMap: testFieldMap })
    ).toEqual({
      name: 'test-mappings',
      _meta: {
        managed: true,
      },
      template: {
        settings: {},
        mappings: {
          dynamic: 'strict',
          ...expectedTestMapping,
        },
      },
    });
  });

  it('correctly creates component template with settings when includeSettings = true', () => {
    expect(
      getComponentTemplateFromFieldMap({
        name: 'test-mappings',
        fieldMap: testFieldMap,
        includeSettings: true,
      })
    ).toEqual({
      name: 'test-mappings',
      _meta: {
        managed: true,
      },
      template: {
        settings: {
          number_of_shards: 1,
          'index.mapping.total_fields.limit': 1500,
        },
        mappings: {
          dynamic: 'strict',
          ...expectedTestMapping,
        },
      },
    });
  });

  it('correctly creates component template with dynamic setting when defined', () => {
    expect(
      getComponentTemplateFromFieldMap({
        name: 'test-mappings',
        fieldMap: testFieldMap,
        includeSettings: true,
        dynamic: false,
      })
    ).toEqual({
      name: 'test-mappings',
      _meta: {
        managed: true,
      },
      template: {
        settings: {
          number_of_shards: 1,
          'index.mapping.total_fields.limit': 1500,
        },
        mappings: {
          dynamic: false,
          ...expectedTestMapping,
        },
      },
    });
  });
});
