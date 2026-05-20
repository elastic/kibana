import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { FullTraceWaterfallProps } from '@kbn/apm-types';
export declare function createLazyFullTraceWaterfallRenderer({ core }: {
    core: CoreStart;
}): (props: FullTraceWaterfallProps) => React.JSX.Element;
