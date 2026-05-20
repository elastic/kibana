/**
 * Takes an iterable input and a map function, outputs a new mapped array that removes
 * all `null` or `undefined` slots.
 */
export declare function compactMap<T, U>(array: Iterable<T>, mapFn: (val: T) => U | undefined | null): U[];
