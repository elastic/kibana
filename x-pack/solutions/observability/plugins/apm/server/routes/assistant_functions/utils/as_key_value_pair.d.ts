import type { KeyValuePair } from '@kbn/key-value-metadata-table';
/**
 * Sorts and maps the record into an array of `key`/`value` objects. Flattens multi-values into single value items.
 */
export declare function asKeyValuePairs<T extends Record<string, any>>(record?: T | null): KeyValuePair[];
