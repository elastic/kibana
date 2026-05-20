import type * as t from 'io-ts';
export declare function getDurationRt({ min, max }: {
    min?: string;
    max?: string;
}): t.Type<string, string, unknown>;
