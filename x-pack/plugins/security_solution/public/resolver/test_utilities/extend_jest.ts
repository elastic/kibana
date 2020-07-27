/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Typescript won't allow global namespace stuff unless you're in a module.
 * This wouldn't otherwise be a module. The code runs as soon as it's imported.
 * This is done this way because the `declare` will be active on import, so in
 * order to be correct, the code that the `declare` declares needs to be available on import as well.
 */
export {};
declare global {
  /* eslint-disable @typescript-eslint/no-namespace */
  namespace jest {
    interface Matchers<R, T> {
      toSometimesYieldEqualTo(
        expectedYield: T extends AsyncIterable<infer E> ? E : never
      ): Promise<R>;
    }
  }
}

expect.extend({
  /**
   * A custom matcher that takes an async generator and compares each value it yields to an expected value.
   * If any yielded value deep-equals the expected value, the matcher will pass.
   * If the generator ends with none of the yielded values matching, it will fail.
   */
  async toSometimesYieldEqualTo<T>(
    this: jest.MatcherContext,
    receivedIterable: AsyncIterable<T>,
    expected: T
  ): Promise<{ pass: boolean; message: () => string }> {
    // Used in printing out the pass or fail message
    const matcherName = 'toSometimesYieldEqualTo';
    const options = {
      comment: 'deep equality with any yielded value',
      isNot: this.isNot,
      promise: this.promise,
    };
    // The last value received: Used in printing the message
    let lastReceived: T | undefined;

    // Set to true if the test passes.
    let pass: boolean = false;

    // Async iterate over the iterable
    for await (const received of receivedIterable) {
      // keep track of the last value. Used in both pass and fail messages
      lastReceived = received;
      // Use deep equals to compare the value to the expected value
      if (this.equals(received, expected)) {
        // If the value is equal, break
        pass = true;
        break;
      }
    }

    // Use `pass` as set in the above loop (or initialized to `false`)
    // See https://jestjs.io/docs/en/expect#custom-matchers-api and https://jestjs.io/docs/en/expect#thisutils
    const message = pass
      ? () =>
          `${this.utils.matcherHint(matcherName, undefined, undefined, options)}\n\n` +
          `Expected: not ${this.utils.printExpected(expected)}\n${
            this.utils.stringify(expected) !== this.utils.stringify(lastReceived!)
              ? `Received:     ${this.utils.printReceived(lastReceived)}`
              : ''
          }`
      : () =>
          `${this.utils.matcherHint(
            matcherName,
            undefined,
            undefined,
            options
          )}\n\n${this.utils.printDiffOrStringify(
            expected,
            lastReceived,
            'Expected',
            'Received',
            this.expand
          )}`;

    return { message, pass };
  },
});
