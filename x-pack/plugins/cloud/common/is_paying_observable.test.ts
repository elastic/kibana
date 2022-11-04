/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, of } from 'rxjs';
import { isPayingObservable } from './is_paying_observable';

describe('isPayingObservable', () => {
  test.each`
    inTrial  | isElasticStaffOwned | expected
    ${true}  | ${true}             | ${false}
    ${true}  | ${false}            | ${false}
    ${false} | ${true}             | ${false}
    ${false} | ${false}            | ${true}
  `(
    'returns $expected when inTrial: $inTrial and isElasticStaffOwned: $isElasticStaffOwned',
    async ({ inTrial, isElasticStaffOwned, expected }) => {
      const isPaying$ = isPayingObservable({ inTrial$: of(inTrial), isElasticStaffOwned });
      await expect(firstValueFrom(isPaying$)).resolves.toEqual(expected);
    }
  );
});
