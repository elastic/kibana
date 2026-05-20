import React from 'react';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
interface Props {
    eventType: ProcessorEvent.transaction | ProcessorEvent.span;
    totalDocCount?: number;
}
export declare function TotalDocCountLabel({ eventType, totalDocCount }: Props): React.JSX.Element | null;
export {};
