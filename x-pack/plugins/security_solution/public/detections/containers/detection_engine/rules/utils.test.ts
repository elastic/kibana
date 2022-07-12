/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterOptions } from './types';
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

    expect(kql).toBe(
      '(alert.attributes.name: "foo" OR alert.attributes.params.index: "foo" OR alert.attributes.params.threat.tactic.id: "foo" OR alert.attributes.params.threat.tactic.name: "foo" OR alert.attributes.params.threat.technique.id: "foo" OR alert.attributes.params.threat.technique.name: "foo" OR alert.attributes.params.threat.technique.subtechnique.id: "foo" OR alert.attributes.params.threat.technique.subtechnique.name: "foo")'
    );
  });

  it('escapes "filter" value properly', () => {
    const kql = convertRulesFilterToKQL({ ...filterOptions, filter: '" OR (foo: bar)' });

    expect(kql).toBe(
      '(alert.attributes.name: "\\" OR (foo: bar)" OR alert.attributes.params.index: "\\" OR (foo: bar)" OR alert.attributes.params.threat.tactic.id: "\\" OR (foo: bar)" OR alert.attributes.params.threat.tactic.name: "\\" OR (foo: bar)" OR alert.attributes.params.threat.technique.id: "\\" OR (foo: bar)" OR alert.attributes.params.threat.technique.name: "\\" OR (foo: bar)" OR alert.attributes.params.threat.technique.subtechnique.id: "\\" OR (foo: bar)" OR alert.attributes.params.threat.technique.subtechnique.name: "\\" OR (foo: bar)")'
    );
  });

  it('handles presence of "showCustomRules" properly', () => {
    const kql = convertRulesFilterToKQL({ ...filterOptions, showCustomRules: true });

    expect(kql).toBe(`alert.attributes.params.immutable: false`);
  });

  it('handles presence of "showElasticRules" properly', () => {
    const kql = convertRulesFilterToKQL({ ...filterOptions, showElasticRules: true });

    expect(kql).toBe(`alert.attributes.params.immutable: true`);
  });

  it('handles presence of "showElasticRules" and "showCustomRules" at the same time properly', () => {
    const kql = convertRulesFilterToKQL({
      ...filterOptions,
      showElasticRules: true,
      showCustomRules: true,
    });

    expect(kql).toBe('');
  });

  it('handles presence of "tags" properly', () => {
    const kql = convertRulesFilterToKQL({ ...filterOptions, tags: ['tag1', 'tag2'] });

    expect(kql).toBe('alert.attributes.tags:("tag1" AND "tag2")');
  });

  it('handles combination of different properties properly', () => {
    const kql = convertRulesFilterToKQL({
      ...filterOptions,
      filter: 'foo',
      showElasticRules: true,
      tags: ['tag1', 'tag2'],
    });

    expect(kql).toBe(
      `alert.attributes.params.immutable: true AND alert.attributes.tags:("tag1" AND "tag2") AND (alert.attributes.name: "foo" OR alert.attributes.params.index: "foo" OR alert.attributes.params.threat.tactic.id: "foo" OR alert.attributes.params.threat.tactic.name: "foo" OR alert.attributes.params.threat.technique.id: "foo" OR alert.attributes.params.threat.technique.name: "foo" OR alert.attributes.params.threat.technique.subtechnique.id: "foo" OR alert.attributes.params.threat.technique.subtechnique.name: "foo")`
    );
  });

  it('handles presence of "excludeRuleTypes" properly', () => {
    const kql = convertRulesFilterToKQL({
      ...filterOptions,
      excludeRuleTypes: ['machine_learning', 'saved_query'],
    });

    expect(kql).toBe('NOT alert.attributes.params.type: ("machine_learning" OR "saved_query")');
  });
});
