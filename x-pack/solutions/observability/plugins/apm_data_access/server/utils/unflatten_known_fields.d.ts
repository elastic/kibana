import type { ValuesType } from 'utility-types';
import { type UnflattenedKnownFields } from './utility_types';
export declare function unflattenKnownApmEventFields<T extends Record<string, any> | undefined = undefined>(fields: T): T extends Record<string, any> ? UnflattenedKnownFields<T> : undefined;
export declare function unflattenKnownApmEventFields<T extends Record<string, any> | undefined, U extends Array<keyof Exclude<T, undefined>>>(fields: T, required: U): T extends Record<string, any> ? UnflattenedKnownFields<T> & (U extends any[] ? UnflattenedKnownFields<{
    [TKey in ValuesType<U>]: keyof T extends TKey ? T[TKey] : unknown[];
}> : {}) : undefined;
