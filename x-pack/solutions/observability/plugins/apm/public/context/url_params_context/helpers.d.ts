import type { UrlParams } from './types';
export declare function getDateRange({ state, rangeFrom, rangeTo, }: {
    state?: Pick<UrlParams, 'rangeFrom' | 'rangeTo' | 'start' | 'end'>;
    rangeFrom?: string;
    rangeTo?: string;
}): {
    start: string | undefined;
    end: string | undefined;
};
export declare function toNumber(value?: string): number | undefined;
export declare function toString(value?: string): string | undefined;
export declare function toBoolean(value?: string): value is "true";
export declare function removeUndefinedProps<T extends object>(obj: T): Partial<T>;
