import React from 'react';
import type { FocusedTraceWaterfallProps } from '@kbn/apm-types';
import type { CoreStart } from '@kbn/core/public';
interface Props extends FocusedTraceWaterfallProps {
    core: CoreStart;
}
export declare function FocusedTraceWaterfallRenderer({ traceId, rangeFrom, rangeTo, docId, core }: Props): React.JSX.Element;
export {};
