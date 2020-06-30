/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface SignalArgs {
  signal: AbortSignal;
}

export type OptionalSignalArgs<Args> = Omit<Args, 'signal'> & Partial<SignalArgs>;

export const withOptionalSignal = <Args extends SignalArgs, Result>(fn: (args: Args) => Result) => (
  args: OptionalSignalArgs<Args>
): Result => {
  const signal = args.signal ?? new AbortController().signal;
  return fn({ ...args, signal } as Args);
};
