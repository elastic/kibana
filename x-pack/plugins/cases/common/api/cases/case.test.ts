/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exactCheck, formatErrors } from '@kbn/securitysolution-io-ts-utils';
import type * as rt from 'io-ts';
import { identity, pipe } from 'fp-ts/lib/function';
import type { CasesByAlertId } from './case';
import { createRecordOfCommentType, CasesByAlertIdRt } from './case';
import { fold } from 'fp-ts/lib/Either';
import { CaseStatuses } from '@kbn/cases-components';

describe('case schema', () => {
  describe('CasesByAlertIdRt', () => {
    it('correctly decodes an object with all the CommentTypes as keys for totals', () => {
      expect(() => decode(createTestObj())).not.toThrow();
    });

    it('throws when the object does not have the alerts field in the totals', () => {
      expect(() =>
        decode([
          {
            id: '123',
            title: 'abc',
            description: 'description',
            status: CaseStatuses.closed,
            totals: {
              user: 5,
              actions: 5,
              externalReference: 5,
              persistableState: 5,
            },
          },
        ])
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid value \\"undefined\\" supplied to \\"totals,alert\\""`
      );
    });
  });
});

const decode = (data: unknown): CasesByAlertId => {
  const onLeft = (errors: rt.Errors) => {
    throw new Error(formatErrors(errors).join());
  };

  const onRight = (a: CasesByAlertId): CasesByAlertId => identity(a);

  return pipe(
    CasesByAlertIdRt.decode(data),
    (decoded) => exactCheck(data, decoded),
    fold(onLeft, onRight)
  );
};

const createTestObj = (): CasesByAlertId => [
  {
    id: '123',
    title: 'abc',
    description: 'description',
    status: CaseStatuses.open,
    totals: createTotalsField(),
  },
];

const createTotalsField = () =>
  createRecordOfCommentType<number>((acc, commentType) => ({ ...acc, [commentType]: 5 }));
