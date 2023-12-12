/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationFields } from '../../../../common/api/detection_engine';
import type { Rule } from './types';
import { transformRuleFromAlertHit } from './use_rule_with_fallback';

export const getMockAlertSearchResponse = (rule: Rule) => ({
  took: 1,
  timeout: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 75,
      relation: 'eq',
    },
    max_score: null,
    hits: [
      {
        _id: '1234',
        _index: '.kibana',
        _source: {
          '@timestamp': '12334232132',
          kibana: {
            alert: {
              rule,
            },
          },
        },
      },
    ],
  },
});

describe('use_rule_with_fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('transformRuleFromAlertHit', () => {
    // Testing edge case, where if hook does not find the rule and turns to the alert document,
    // the alert document could still have an unmigrated, legacy version of investigation_fields.
    // We are not looking to do any migrations to these legacy fields in the alert document, so need
    // to transform it on read in this case.
    describe('investigation_fields', () => {
      it('sets investigation_fields to undefined when set as legacy array', () => {
        const mockRule = getMockRule({
          investigation_fields: ['foo'] as unknown as InvestigationFields,
        });
        const mockHit = getMockAlertSearchResponse(mockRule);
        const result = transformRuleFromAlertHit(mockHit);
        expect(result?.investigation_fields).toBeUndefined();
      });

      it('sets investigation_fields to undefined when set as legacy empty array', () => {
        // Ideally, we would have the client side types pull from the same types
        // as server side so we could denote here that the SO can have investigation_fields
        // as array or object, but our APIs now only support object. We don't have that here
        // and would need to adjust the client side type to support both, which we do not want
        // to do in this instance as we try to migrate folks away from the array version.
        const mockRule = getMockRule({
          investigation_fields: [] as unknown as InvestigationFields,
        });
        const mockHit = getMockAlertSearchResponse(mockRule);
        const result = transformRuleFromAlertHit(mockHit);
        expect(result?.investigation_fields).toBeUndefined();
      });

      it('does no transformation when "investigation_fields" is intended type', () => {
        const mockRule = getMockRule({ investigation_fields: { field_names: ['bar'] } });
        const mockHit = getMockAlertSearchResponse(mockRule);
        const result = transformRuleFromAlertHit(mockHit);
        expect(result?.investigation_fields).toEqual({ field_names: ['bar'] });
      });
    });
  });
});

const getMockRule = (overwrites: Pick<Rule, 'investigation_fields'>): Rule => ({
  id: 'myfakeruleid',
  author: [],
  severity_mapping: [],
  risk_score_mapping: [],
  rule_id: 'rule-1',
  risk_score: 50,
  description: 'some description',
  from: 'now-5m',
  to: 'now',
  name: 'some-name',
  severity: 'low',
  type: 'query',
  language: 'kuery',
  query: 'some query',
  index: ['index-1'],
  interval: '5m',
  references: [],
  actions: [],
  enabled: false,
  false_positives: [],
  max_signals: 100,
  tags: [],
  threat: [],
  version: 1,
  revision: 1,
  exceptions_list: [],
  created_at: '2020-04-09T09:43:51.778Z',
  created_by: 'elastic',
  immutable: false,
  updated_at: '2020-04-09T09:43:51.778Z',
  updated_by: 'elastic',
  related_integrations: [],
  required_fields: [],
  setup: '',
  ...overwrites,
});
