import type { BaseFlameGraph } from '@kbn/profiling-utils';
import React from 'react';
import type { FETCH_STATUS } from '../../../../hooks/use_fetcher';
interface Props {
    data?: BaseFlameGraph;
    status: FETCH_STATUS;
}
export declare function FlamegraphChart({ data, status }: Props): React.JSX.Element;
export {};
