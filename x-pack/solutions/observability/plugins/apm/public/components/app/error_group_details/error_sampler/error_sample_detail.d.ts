import React from 'react';
import type { AT_TIMESTAMP } from '../../../../../common/es_fields/apm';
import type { APMError } from '../../../../../typings/es_schemas/ui/apm_error';
import type { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import type { ErrorTab } from './error_tabs';
interface Props {
    onSampleClick: (sample: string) => void;
    errorSampleIds: string[];
    errorSamplesFetchStatus: FETCH_STATUS;
    errorData: APIReturnType<'GET /internal/apm/services/{serviceName}/errors/{groupId}/error/{errorId}'>;
    errorFetchStatus: FETCH_STATUS;
    occurrencesCount: number;
}
export declare function ErrorSampleDetails({ onSampleClick, errorSampleIds, errorSamplesFetchStatus, errorData, errorFetchStatus, occurrencesCount, }: Props): React.JSX.Element;
export declare function ErrorSampleDetailTabContent({ error, currentTab, }: {
    error: {
        service?: {
            language?: {
                name?: string;
            };
        };
        [AT_TIMESTAMP]: string;
        error: Pick<APMError['error'], 'id' | 'log' | 'stack_trace' | 'exception'>;
    };
    currentTab: ErrorTab;
}): React.JSX.Element;
export {};
