import type { FullTraceWaterfallProps } from '@kbn/apm-types';
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
type Props = FullTraceWaterfallProps & {
    core: CoreStart;
};
export declare function FullTraceWaterfallRenderer({ traceId, rangeFrom, rangeTo, serviceName, scrollElement, onNodeClick, onErrorClick, core, ebt, ...scrollProps }: Props): React.JSX.Element;
export {};
