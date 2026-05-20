import React from 'react';
import type { FETCH_STATUS } from '../../../../hooks/use_fetcher';
interface Props {
    errorSampleIds: string[];
    errorSamplesFetchStatus: FETCH_STATUS;
    occurrencesCount: number;
}
export declare function ErrorSampler({ errorSampleIds, errorSamplesFetchStatus, occurrencesCount }: Props): React.JSX.Element;
export {};
