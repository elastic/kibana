/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_OTHER_FIELDS_LENGTH } from '../../../common/jira/constants';
import { ExecutorSubActionPushParamsSchema, incidentSchemaObjectProperties } from './schema';

describe('Jira schema', () => {
  const incident = {
    summary: 'title',
    description: 'desc',
    labels: [],
    issueType: '10006',
    priority: 'High',
    parent: 'RJ-107',
    otherFields: null,
  };

  describe('ExecutorSubActionPushParamsSchema', () => {
    it('validates the test object ExecutorSubActionPushParamsSchema correctly', () => {
      expect(() => ExecutorSubActionPushParamsSchema.validate({ incident })).not.toThrow();
    });

    describe('otherFields', () => {
      it('validates the otherFields correctly', () => {
        expect(() =>
          ExecutorSubActionPushParamsSchema.validate({
            incident: {
              ...incident,
              otherFields: {
                foo: 'bar',
                foo1: true,
                foo2: 2,
              },
            },
          })
        ).not.toThrow();
      });

      it('throws if the otherFields object has too many properties', () => {
        const otherFields = new Array(MAX_OTHER_FIELDS_LENGTH + 1)
          .fill('foobar')
          .reduce((acc, curr, idx) => {
            acc[idx] = curr;
            return acc;
          }, {});

        expect(() =>
          ExecutorSubActionPushParamsSchema.validate({
            incident: {
              ...incident,
              otherFields,
            },
          })
        ).toThrow('A maximum of 20 otherFields can be defined at a time.');
      });

      it.each(incidentSchemaObjectProperties)(
        'throws if the otherFields object has the %p property',
        (property) => {
          const otherFields = {
            [property]: 'foobar',
          };
          expect(() =>
            ExecutorSubActionPushParamsSchema.validate({
              incident: {
                ...incident,
                otherFields,
              },
            })
          ).toThrow(`The following properties cannot be defined inside otherFields: ${property}.`);
        }
      );
    });
  });
});
