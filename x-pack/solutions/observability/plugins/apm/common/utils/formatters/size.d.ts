import type { Maybe } from '../../../typings/common';
export declare const getFixedByteFormatter: ((max: number) => (val: Maybe<number>) => string) & import("lodash").MemoizedFunction;
export declare const asDynamicBytes: (val: Maybe<number>) => string;
