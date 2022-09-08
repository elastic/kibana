/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeIndexTemplateWithMappings } from './merge_index_template_mappings';

describe('Fleet - mergeIndexTemplateWithMappings', () => {
  it('returns undefined if neither index template nor mappings is defined', () => {
    expect(mergeIndexTemplateWithMappings(undefined, undefined)).toStrictEqual(undefined);
  });

  it('merges undefined template or undefined mappings', () => {
    expect(mergeIndexTemplateWithMappings({ settings: {} }, undefined)).toStrictEqual({
      settings: {},
    });

    expect(mergeIndexTemplateWithMappings(undefined, { field: 'value' })).toStrictEqual({
      mappings: { field: 'value' },
    });
  });
  it('merges original template mappings with new mappings', () => {
    expect(
      mergeIndexTemplateWithMappings(
        { settings: {}, mappings: { field1: 'value1' } },
        { field2: 'value2' }
      )
    ).toStrictEqual({
      settings: {},
      mappings: { field1: 'value1', field2: 'value2' },
    });
  });
  it('overrides original index template mappings with values from mappings', () => {
    expect(
      mergeIndexTemplateWithMappings(
        { settings: {}, mappings: { field: 'valueFromIndex' } },
        { field: 'valueFromMapping', field2: 'value2' }
      )
    ).toStrictEqual({
      settings: {},
      mappings: { field: 'valueFromMapping', field2: 'value2' },
    });
  });
});
