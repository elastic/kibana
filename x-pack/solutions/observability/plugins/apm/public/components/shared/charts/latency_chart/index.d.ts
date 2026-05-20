import React from 'react';
interface Props {
    height?: number;
    kuery: string;
}
export type { Props };
export declare function filterNil<T>(value: T | null | undefined): value is T;
export declare function LatencyChart({ height, kuery }: Props): React.JSX.Element;
