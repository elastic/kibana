import type { EuiFlexGroupProps } from '@elastic/eui';
import React from 'react';
interface Props {
    kuery: string;
    rangeFrom: string;
    rangeTo: string;
    justifyContent?: EuiFlexGroupProps['justifyContent'];
}
export declare function ProfilingTopNFunctionsLink({ kuery, rangeFrom, rangeTo, justifyContent, }: Props): React.JSX.Element;
export {};
