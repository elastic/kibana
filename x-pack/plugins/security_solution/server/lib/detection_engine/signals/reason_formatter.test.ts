/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCommonReasonMessage } from './reason_formatters';
import { RulesSchema } from '../../../../common/detection_engine/schemas/response/rules_schema';
import { SignalSourceHit } from './types';

describe('reason_formatter', () => {
  let rule: RulesSchema;
  let mergedDoc: SignalSourceHit;
  beforeAll(() => {
    rule = {
      name: 'What is in a name',
      risk_score: 9000,
      severity: 'medium',
    } as RulesSchema; // Cast here as all fields aren't required
    mergedDoc = {
      _index: 'some-index',
      _id: 'some-id',
      fields: {
        'host.name': ['party host'],
        'user.name': ['ferris bueller'],
        '@timestamp': '2021-08-11T02:28:59.101Z',
      },
    };
  });

  describe('buildCommonReasonMessage', () => {
    describe('when rule and mergedDoc are provided', () => {
      it('should return the full reason message', () => {
        expect(buildCommonReasonMessage({ rule, mergedDoc })).toEqual(
          'Alert What is in a name created with a medium severity and risk score of 9000 by ferris bueller on party host.'
        );
      });
    });
    describe('when rule and mergedDoc are provided, but host.name is missing', () => {
      it('should return the reason message without the host name', () => {
        const updatedMergedDoc = {
          ...mergedDoc,
          fields: {
            ...mergedDoc.fields,
            'host.name': ['-'],
          },
        };
        expect(buildCommonReasonMessage({ rule, mergedDoc: updatedMergedDoc })).toEqual(
          'Alert What is in a name created with a medium severity and risk score of 9000 by ferris bueller.'
        );
      });
    });
    describe('when rule and mergedDoc are provided, but user.name is missing', () => {
      it('should return the reason message without the user name', () => {
        const updatedMergedDoc = {
          ...mergedDoc,
          fields: {
            ...mergedDoc.fields,
            'user.name': ['-'],
          },
        };
        expect(buildCommonReasonMessage({ rule, mergedDoc: updatedMergedDoc })).toEqual(
          'Alert What is in a name created with a medium severity and risk score of 9000 on party host.'
        );
      });
    });
    describe('when only rule is provided', () => {
      it('should return the reason message without host name or user name', () => {
        expect(buildCommonReasonMessage({ rule })).toEqual(
          'Alert What is in a name created with a medium severity and risk score of 9000.'
        );
      });
    });
  });
});
