/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexTemplate, getIlmPolicy } from './documents';
import { getEsNames } from './names';

describe('getIlmPolicy()', () => {
  test('returns the basic structure of an ilm policy', () => {
    expect(getIlmPolicy()).toMatchObject({
      policy: {
        phases: {},
      },
    });
  });
});

describe('getIndexTemplate()', () => {
  const kibanaVersion = '1.2.3';
  const esNames = getEsNames('XYZ', kibanaVersion);

  test('returns the correct details of the index template', () => {
    const indexTemplate = getIndexTemplate(esNames);
    expect(indexTemplate.index_patterns).toEqual([esNames.indexPatternWithVersion]);
    expect(indexTemplate.template.settings.number_of_shards).toBeGreaterThanOrEqual(0);
    expect(indexTemplate.template.settings.auto_expand_replicas).toBe('0-1');
    expect(indexTemplate.template.settings['index.lifecycle.name']).toBe(esNames.ilmPolicy);
    expect(indexTemplate.template.settings['index.lifecycle.rollover_alias']).toBe(esNames.alias);
    expect(indexTemplate.template.settings['index.hidden']).toBe(true);
    expect(indexTemplate.template.mappings).toMatchObject({});
  });
});
