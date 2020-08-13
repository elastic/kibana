/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { limitOne } from './retry_setup';

// async function succeeds(value: string | number) {
//   return `value is ${value}`;
// }
// async function throws(value: string | number) {
//   throw new Error(`error is ${value}`);
// }

const succeeds = jest.fn().mockImplementation((value: string | number) => `value is ${value}`);
const throws = jest.fn().mockImplementation((value: string | number) => {
  throw new Error(`error is ${value}`);
});

describe('limitOne', () => {
  it('reject/throws is called again & its value returned', async () => {
    const firstCall = limitOne(() => throws(6));
    await expect(firstCall).rejects.toThrow(`error is 6`);

    const secondCall = limitOne(() => throws(61));
    await expect(secondCall).rejects.toThrow(`error is 61`);

    const thirdCall = limitOne(() => throws(66));
    await expect(thirdCall).rejects.toThrow(`error is 66`);
  });

  it('the first success value is cached', async () => {
    const firstCall = limitOne(() => succeeds(12));
    await expect(firstCall).resolves.toBe(`value is 12`);

    const secondCall = limitOne(() => succeeds(2));
    await expect(secondCall).resolves.toBe(`value is 2`);

    const thirdCall = limitOne(() => succeeds(3));
    await expect(thirdCall).resolves.toBe(`value is 3`);

    const fourthCall = limitOne(() => throws(6));
    await expect(fourthCall).rejects.toThrow(`error is 6`);

    const fifthCall = limitOne(() => throws(61));
    await expect(fifthCall).rejects.toThrow(`error is 61`);

    const sixthCall = limitOne(() => throws(66));
    await expect(sixthCall).rejects.toThrow(`error is 66`);
  });

  it('concurrency=1', async () => {
    const fnA = jest.fn().mockImplementation(() => {
      throw new Error('mocked');
    });
    const fnB = jest.fn().mockResolvedValue(2);
    const fnC = jest.fn().mockResolvedValue(3);
    const fnD = jest.fn().mockResolvedValue(4);

    const promises = Promise.all([limitOne(fnA), limitOne(fnB), limitOne(fnC), limitOne(fnD)]);

    expect(fnA).toHaveBeenCalledTimes(1);
    expect(fnB).toHaveBeenCalledTimes(1);
    expect(fnC).toHaveBeenCalledTimes(0);
    expect(fnD).toHaveBeenCalledTimes(0);
    await expect(promises).rejects.toThrow('mocked');

    const promisesB = Promise.all([limitOne(fnB), limitOne(fnA), limitOne(fnC), limitOne(fnD)]);

    expect(fnA).toHaveBeenCalledTimes(1);
    expect(fnB).toHaveBeenCalledTimes(2);
    expect(fnC).toHaveBeenCalledTimes(0);
    expect(fnD).toHaveBeenCalledTimes(0);
    expect(promisesB).resolves.toBe('2');
  });
});
