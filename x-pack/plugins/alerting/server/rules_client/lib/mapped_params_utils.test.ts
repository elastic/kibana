/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import {
  getMappedParams,
  getModifiedFilter,
  getModifiedField,
  getModifiedSearchFields,
  getModifiedSearch,
  getModifiedValue,
  modifyFilterKueryNode,
} from './mapped_params_utils';

describe('getModifiedParams', () => {
  it('converts params to mapped params', () => {
    const params = {
      riskScore: 42,
      severity: 'medium',
      a: 'test',
      b: 'test',
      c: 'test,',
    };

    expect(getMappedParams(params)).toEqual({
      risk_score: 42,
      severity: '40-medium',
    });
  });

  it('returns empty mapped params if nothing exists in the input params', () => {
    const params = {
      a: 'test',
      b: 'test',
      c: 'test',
    };

    expect(getMappedParams(params)).toEqual({});
  });
});

describe('getModifiedFilter', () => {
  it('converts params filters to mapped params filters', () => {
    // Make sure it works for both camel and snake case params
    const filter = 'alert.attributes.params.risk_score: 45';

    expect(getModifiedFilter(filter)).toEqual('alert.attributes.mapped_params.risk_score: 45');
  });
});

describe('getModifiedField', () => {
  it('converts sort field to mapped params sort field', () => {
    expect(getModifiedField('params.risk_score')).toEqual('mapped_params.risk_score');
    expect(getModifiedField('params.riskScore')).toEqual('mapped_params.risk_score');
    expect(getModifiedField('params.invalid')).toEqual('params.invalid');
  });
});

describe('getModifiedSearchFields', () => {
  it('converts a list of params search fields to mapped param search fields', () => {
    const searchFields = [
      'params.risk_score',
      'params.riskScore',
      'params.severity',
      'params.invalid',
      'invalid',
    ];

    expect(getModifiedSearchFields(searchFields)).toEqual([
      'mapped_params.risk_score',
      'mapped_params.risk_score',
      'mapped_params.severity',
      'params.invalid',
      'invalid',
    ]);
  });
});

describe('getModifiedSearch', () => {
  it('converts the search value depending on the search field', () => {
    const searchFields = ['params.severity', 'another'];

    expect(getModifiedSearch(searchFields, 'medium')).toEqual('40-medium');
    expect(getModifiedSearch(searchFields, 'something else')).toEqual('something else');
    expect(getModifiedSearch('params.risk_score', 'something else')).toEqual('something else');
    expect(getModifiedSearch('mapped_params.severity', 'medium')).toEqual('40-medium');
  });
});

describe('getModifiedValue', () => {
  it('converts severity strings to sortable strings', () => {
    expect(getModifiedValue('severity', 'low')).toEqual('20-low');
    expect(getModifiedValue('severity', 'medium')).toEqual('40-medium');
    expect(getModifiedValue('severity', 'high')).toEqual('60-high');
    expect(getModifiedValue('severity', 'critical')).toEqual('80-critical');
  });
});

describe('modifyFilterKueryNode', () => {
  it('modifies the resulting kuery node AST filter for alert params', () => {
    const astFilter = fromKueryExpression(
      'alert.attributes.name: "Rule I" and alert.attributes.tags: "fast" and alert.attributes.params.severity > medium'
    );

    expect(astFilter.arguments[2].arguments[0]).toEqual({
      type: 'literal',
      value: 'alert.attributes.params.severity',
    });

    expect(astFilter.arguments[2].arguments[2]).toEqual({
      type: 'literal',
      value: 'medium',
    });

    modifyFilterKueryNode({ astFilter });

    expect(astFilter.arguments[2].arguments[0]).toEqual({
      type: 'literal',
      value: 'alert.attributes.mapped_params.severity',
    });

    expect(astFilter.arguments[2].arguments[2]).toEqual({
      type: 'literal',
      value: '40-medium',
    });
  });

  it('do NOT modify the resulting kuery node AST filter for alert params when they are not part of mapped params', () => {
    // Make sure it works for both camel and snake case params
    const astFilter = fromKueryExpression(
      'alert.attributes.name: "Rule I" and alert.attributes.tags: "fast" and alert.attributes.params.threat.tactic.name: Exfiltration'
    );

    modifyFilterKueryNode({ astFilter });

    expect(astFilter.arguments[2].arguments[0]).toEqual({
      type: 'literal',
      value: 'alert.attributes.params.threat.tactic.name',
    });

    expect(astFilter.arguments[2].arguments[1]).toEqual({
      type: 'literal',
      value: 'Exfiltration',
    });
  });
});
