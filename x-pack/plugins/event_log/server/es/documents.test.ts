/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  const esNames = getEsNames('XYZ');

  test('returns the correct details of the index template', () => {
    const indexTemplate = getIndexTemplate(esNames);
    expect(indexTemplate.index_patterns).toEqual([esNames.indexPattern]);
    expect(indexTemplate.aliases[esNames.alias]).toEqual({});
    expect(indexTemplate.settings.number_of_shards).toBeGreaterThanOrEqual(0);
    expect(indexTemplate.settings.number_of_replicas).toBeGreaterThanOrEqual(0);
    expect(indexTemplate.settings['index.lifecycle.name']).toBe(esNames.ilmPolicy);
    expect(indexTemplate.settings['index.lifecycle.rollover_alias']).toBe(esNames.alias);
    expect(indexTemplate.mappings).toMatchObject({});
  });
});
