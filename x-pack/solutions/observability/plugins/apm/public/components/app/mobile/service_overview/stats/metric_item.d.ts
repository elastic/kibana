import React from 'react';
import type { MetricDatum } from '@elastic/charts';
export declare function MetricItem({ data, id, isLoading, height, }: {
    data: MetricDatum[];
    id: number;
    isLoading: boolean;
    height?: string;
}): React.JSX.Element;
