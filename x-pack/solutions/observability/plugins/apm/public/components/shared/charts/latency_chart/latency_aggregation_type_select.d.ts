import React from 'react';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
export declare function LatencyAggregationTypeSelect({ latencyAggregationType, onChange, }: {
    latencyAggregationType?: LatencyAggregationType;
    onChange: (value: LatencyAggregationType) => void;
}): React.JSX.Element;
