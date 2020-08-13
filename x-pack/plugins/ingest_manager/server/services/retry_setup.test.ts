/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { firstSuccessOrTryAgain } from './retry_setup';

async function succeeds(value: string | number) {
  return `value is ${value}`;
}
async function throws(value: string | number) {
  throw new Error(`error is ${value}`);
}

describe('firstSuccessOrTryAgain', () => {
  it('reject/throws is called again & its value returned', async () => {
    const firstCall = firstSuccessOrTryAgain(() => throws(6));
    await expect(firstCall).rejects.toThrow(`error is 6`);

    const secondCall = firstSuccessOrTryAgain(() => throws(61));
    await expect(secondCall).rejects.toThrow(`error is 61`);

    const thirdCall = firstSuccessOrTryAgain(() => throws(66));
    await expect(thirdCall).rejects.toThrow(`error is 66`);
  });

  it('the first success value is cached', async () => {
    const successValue = `value is 12`;
    const firstCall = firstSuccessOrTryAgain(() => succeeds(12));
    await expect(firstCall).resolves.toBe(successValue);

    const secondCall = firstSuccessOrTryAgain(() => succeeds(2));
    await expect(secondCall).resolves.toBe(successValue);

    const thirdCall = firstSuccessOrTryAgain(() => succeeds(3));
    await expect(thirdCall).resolves.toBe(successValue);

    const fourthCall = firstSuccessOrTryAgain(() => throws(6));
    await expect(fourthCall).resolves.toBe(successValue);

    const fifthCall = firstSuccessOrTryAgain(() => throws(61));
    await expect(fifthCall).resolves.toBe(successValue);

    const sixthCall = firstSuccessOrTryAgain(() => throws(66));
    await expect(sixthCall).resolves.toBe(successValue);
  });
});
