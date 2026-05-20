import type * as t from 'io-ts';
export declare function getIntegerRt({ min, max, }?: {
    min?: number;
    max?: number;
}): t.Type<string, string, unknown>;
