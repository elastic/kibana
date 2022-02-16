/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getMappedParams,
  getModifiedFilter,
  getModifiedField,
  getModifiedSearchFields,
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
      severity: 'medium',
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
    const filter = `
        (alert.attributes.params.riskScore: 45
        OR alert.attributes.params.risk_score: 45
        OR alert.attributes.params.severity: medium
        OR alert.attributes.params.invalid: blah)
        AND alert.attributes.tags: "__internal_immutable:true"
      `;

    expect(getModifiedFilter(filter)).toEqual(
      `
        (alert.attributes.mapped_params.risk_score: 45
        OR alert.attributes.mapped_params.risk_score: 45
        OR alert.attributes.mapped_params.severity: medium
        OR alert.attributes.params.invalid: blah)
        AND alert.attributes.tags: "__internal_immutable:true"
      `
    );
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
