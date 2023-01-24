/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PatchRuleRequestBody, ThresholdPatchRuleRequestBody } from './request_schema';
import { getPatchRulesSchemaMock, getPatchThresholdRulesSchemaMock } from './request_schema.mock';
import { validatePatchRuleRequestBody } from './request_schema_validation';

describe('Patch rule request schema, additional validation', () => {
  describe('validatePatchRuleRequestBody', () => {
    test('You cannot omit timeline_title when timeline_id is present', () => {
      const schema: PatchRuleRequestBody = {
        ...getPatchRulesSchemaMock(),
        timeline_id: '123',
      };
      delete schema.timeline_title;
      const errors = validatePatchRuleRequestBody(schema);
      expect(errors).toEqual(['when "timeline_id" exists, "timeline_title" must also exist']);
    });

    test('You cannot have empty string for timeline_title when timeline_id is present', () => {
      const schema: PatchRuleRequestBody = {
        ...getPatchRulesSchemaMock(),
        timeline_id: '123',
        timeline_title: '',
      };
      const errors = validatePatchRuleRequestBody(schema);
      expect(errors).toEqual(['"timeline_title" cannot be an empty string']);
    });

    test('You cannot have timeline_title with an empty timeline_id', () => {
      const schema: PatchRuleRequestBody = {
        ...getPatchRulesSchemaMock(),
        timeline_id: '',
        timeline_title: 'some-title',
      };
      const errors = validatePatchRuleRequestBody(schema);
      expect(errors).toEqual(['"timeline_id" cannot be an empty string']);
    });

    test('You cannot have timeline_title without timeline_id', () => {
      const schema: PatchRuleRequestBody = {
        ...getPatchRulesSchemaMock(),
        timeline_title: 'some-title',
      };
      delete schema.timeline_id;
      const errors = validatePatchRuleRequestBody(schema);
      expect(errors).toEqual(['when "timeline_title" exists, "timeline_id" must also exist']);
    });

    test('You cannot have both an id and a rule_id', () => {
      const schema: PatchRuleRequestBody = {
        ...getPatchRulesSchemaMock(),
        id: 'some-id',
        rule_id: 'some-rule-id',
      };
      const errors = validatePatchRuleRequestBody(schema);
      expect(errors).toEqual(['both "id" and "rule_id" cannot exist, choose one or the other']);
    });

    test('You must set either an id or a rule_id', () => {
      const schema: PatchRuleRequestBody = {
        ...getPatchRulesSchemaMock(),
      };
      delete schema.id;
      delete schema.rule_id;
      const errors = validatePatchRuleRequestBody(schema);
      expect(errors).toEqual(['either "id" or "rule_id" must be set']);
    });

    test('threshold.value is required and has to be bigger than 0 when type is threshold and validates with it', () => {
      const schema: ThresholdPatchRuleRequestBody = {
        ...getPatchThresholdRulesSchemaMock(),
        threshold: {
          field: '',
          value: -1,
        },
      };
      const errors = validatePatchRuleRequestBody(schema);
      expect(errors).toEqual(['"threshold.value" has to be bigger than 0']);
    });

    test('threshold.field should contain 3 items or less', () => {
      const schema: ThresholdPatchRuleRequestBody = {
        ...getPatchThresholdRulesSchemaMock(),
        threshold: {
          field: ['field-1', 'field-2', 'field-3', 'field-4'],
          value: 1,
        },
      };
      const errors = validatePatchRuleRequestBody(schema);
      expect(errors).toEqual(['Number of fields must be 3 or less']);
    });

    test('threshold.cardinality[0].field should not be in threshold.field', () => {
      const schema: ThresholdPatchRuleRequestBody = {
        ...getPatchThresholdRulesSchemaMock(),
        threshold: {
          field: ['field-1', 'field-2', 'field-3'],
          value: 1,
          cardinality: [
            {
              field: 'field-1',
              value: 2,
            },
          ],
        },
      };
      const errors = validatePatchRuleRequestBody(schema);
      expect(errors).toEqual(['Cardinality of a field that is being aggregated on is always 1']);
    });
  });
});
