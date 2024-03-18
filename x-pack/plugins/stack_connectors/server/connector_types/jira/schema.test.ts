/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_CUSTOM_FIELDS_LENGTH } from './constants';
import { ExecutorSubActionPushParamsSchema } from './schema';

describe('Jira schema', () => {
  const incident = {
    summary: 'title',
    description: 'desc',
    labels: [],
    issueType: '10006',
    priority: 'High',
    parent: 'RJ-107',
    customFields: null,
  };
  describe('ExecutorSubActionPushParamsSchema', () => {
    it('validates the test object ExecutorSubActionPushParamsSchema correctly', () => {
      expect(() => ExecutorSubActionPushParamsSchema.validate({ incident })).not.toThrow();
    });

    describe('customFields', () => {
      it('validates the customFields correctly', () => {
        expect(() =>
          ExecutorSubActionPushParamsSchema.validate({
            incident: {
              ...incident,
              customFields: {
                foo: 'bar',
                foo1: true,
                foo2: 2,
              },
            },
          })
        ).not.toThrow();
      });

      it('throws if the customFields object has too many properties', () => {
        const customFields = new Array(MAX_CUSTOM_FIELDS_LENGTH + 1)
          .fill('foobar')
          .reduce((acc, curr, idx) => {
            acc[idx] = curr;
            return acc;
          }, {});

        expect(() =>
          ExecutorSubActionPushParamsSchema.validate({
            incident: {
              ...incident,
              customFields,
            },
          })
        ).toThrow('A maximum of 10 customFields can be updated at a time');
      });
    });
  });
});
