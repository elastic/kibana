import type { TimeUnit } from './datetime';
import type { Maybe } from '../../../typings/common';
interface FormatterOptions {
    defaultValue?: string;
}
interface ConvertedDuration {
    value: string;
    unit?: string;
    formatted: string;
}
export type TimeFormatter = (value: Maybe<number>, options?: FormatterOptions) => ConvertedDuration;
type TimeFormatterBuilder = (max: number, threshold?: number, scalingFactor?: number) => TimeFormatter;
export declare const toMicroseconds: (value: number, timeUnit: TimeUnit) => number;
export declare const getDurationFormatter: TimeFormatterBuilder;
export declare function asTransactionRate(value: Maybe<number>): string;
export declare function asTransactionValue(value: Maybe<number>): string;
export declare function asExactTransactionRate(value: number): string;
/**
 * Converts value and returns it formatted - 00 unit
 */
export declare function asDuration(value: Maybe<number>, { defaultValue }?: FormatterOptions): string;
/**
 * Convert a microsecond value to decimal milliseconds. Normally we use
 * `asDuration`, but this is used in places like tables where we always want
 * the same units.
 */
export declare function asMillisecondDuration(value: Maybe<number>): string;
export {};
