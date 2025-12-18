import React from 'react';
type TimeUnit = 'hours' | 'minutes' | 'seconds' | 'milliseconds';
export declare function asAbsoluteDateTime(time: number, timeUnit?: TimeUnit): string;
interface Props {
    /**
     * timestamp in milliseconds
     */
    time: number;
    timeUnit?: TimeUnit;
}
export declare function TimestampTooltip({ time, timeUnit }: Props): React.JSX.Element;
export {};
