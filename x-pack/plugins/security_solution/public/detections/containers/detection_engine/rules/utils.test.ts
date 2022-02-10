/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_IMMUTABLE_KEY } from '../../../../../common/constants';
import { FilterOptions } from './types';
import { convertRulesFilterToKQL } from './utils';

describe('convertRulesFilterToKQL', () => {
  const filterOptions: FilterOptions = {
    filter: '',
    showCustomRules: false,
    showElasticRules: false,
    tags: [],
  };

  it('returns empty string if filter options are empty', () => {
    const kql = convertRulesFilterToKQL(filterOptions);

    expect(kql).toBe('');
  });

  it('handles presence of "filter" properly', () => {
    const kql = convertRulesFilterToKQL({ ...filterOptions, filter: 'foo' });

    expect(kql).toBe('alert.attributes.name: foo');
  });

  it('handles presence of "showCustomRules" properly', () => {
    const kql = convertRulesFilterToKQL({ ...filterOptions, showCustomRules: true });

    expect(kql).toBe(`alert.attributes.tags: "${INTERNAL_IMMUTABLE_KEY}:false"`);
  });

  it('handles presence of "showElasticRules" properly', () => {
    const kql = convertRulesFilterToKQL({ ...filterOptions, showElasticRules: true });

    expect(kql).toBe(`alert.attributes.tags: "${INTERNAL_IMMUTABLE_KEY}:true"`);
  });

  it('handles presence of "tags" properly', () => {
    const kql = convertRulesFilterToKQL({ ...filterOptions, tags: ['tag1', 'tag2'] });

    expect(kql).toBe('alert.attributes.tags: "tag1" AND alert.attributes.tags: "tag2"');
  });

  it('handles combination of different properties properly', () => {
    const kql = convertRulesFilterToKQL({
      ...filterOptions,
      filter: 'foo',
      showElasticRules: true,
      tags: ['tag1', 'tag2'],
    });

    expect(kql).toBe(
      `alert.attributes.name: foo AND alert.attributes.tags: "${INTERNAL_IMMUTABLE_KEY}:true" AND (alert.attributes.tags: "tag1" AND alert.attributes.tags: "tag2")`
    );
  });
});
