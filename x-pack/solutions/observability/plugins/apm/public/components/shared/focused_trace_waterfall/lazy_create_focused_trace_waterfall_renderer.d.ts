import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { FocusedTraceWaterfallProps } from '@kbn/apm-types';
export declare function createLazyFocusedTraceWaterfallRenderer({ core }: {
    core: CoreStart;
}): (props: FocusedTraceWaterfallProps) => React.JSX.Element;
