import type { Maybe } from '../../../typings/common';
export declare function asDecimal(value?: number | null): string;
export declare function asPreciseDecimal(value?: number | null, dp?: number): string;
export declare function asInteger(value?: number | null): string;
export declare function asPercent(numerator: Maybe<number>, denominator: number | undefined, fallbackResult?: string): string;
export declare function asDecimalOrInteger(value: Maybe<number>, threshold?: number): string;
export declare function asBigNumber(value: number): string;
export declare const yLabelAsPercent: (y?: number | null) => string;
