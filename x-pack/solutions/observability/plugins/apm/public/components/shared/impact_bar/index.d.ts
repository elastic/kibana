import React from 'react';
export interface ImpactBarProps extends Record<string, unknown> {
    value: number;
    size?: 's' | 'l' | 'm';
    max?: number;
    color?: string;
}
export declare function ImpactBar({ value, size, max, color, ...rest }: ImpactBarProps): React.JSX.Element;
