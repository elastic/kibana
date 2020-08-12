/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { firstSuccessOrTryAgain } from './retry_setup';

let counter = 0;
async function succeeds() {
  return `counter is ${counter}`;
}
async function throws() {
  throw new Error(`counter is ${counter}`);
}

describe('firstSuccessOrTryAgain', () => {
  it('reject/throws is called again & its value returned', async () => {
    counter = 6;
    const firstCall = firstSuccessOrTryAgain(throws);
    await expect(firstCall).rejects.toThrow(`counter is 6`);

    counter = 61;
    const secondCall = firstSuccessOrTryAgain(throws);
    await expect(secondCall).rejects.toThrow(`counter is 61`);

    counter = 66;
    const thirdCall = firstSuccessOrTryAgain(throws);
    await expect(thirdCall).rejects.toThrow(`counter is 66`);
  });

  it('the first success value is cached', async () => {
    counter = 12;
    const successValue = `counter is 12`;
    const firstCall = firstSuccessOrTryAgain(succeeds);
    await expect(firstCall).resolves.toBe(successValue);

    counter = 2;
    const secondCall = firstSuccessOrTryAgain(succeeds);
    await expect(secondCall).resolves.toBe(successValue);

    counter = 3;
    const thirdCall = firstSuccessOrTryAgain(succeeds);
    await expect(thirdCall).resolves.toBe(successValue);

    counter = 6;
    const fourthCall = firstSuccessOrTryAgain(throws);
    await expect(fourthCall).resolves.toBe(successValue);

    counter = 61;
    const fifthCall = firstSuccessOrTryAgain(throws);
    await expect(fifthCall).resolves.toBe(successValue);

    counter = 66;
    const sixthCall = firstSuccessOrTryAgain(throws);
    await expect(sixthCall).resolves.toBe(successValue);
  });
});
