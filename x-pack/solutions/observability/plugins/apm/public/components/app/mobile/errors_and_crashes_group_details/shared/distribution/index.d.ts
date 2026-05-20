import React from 'react';
import type { FETCH_STATUS } from '../../../../../../hooks/use_fetcher';
import type { APIReturnType } from '../../../../../../services/rest/create_call_apm_api';
type ErrorDistributionAPIResponse = APIReturnType<'GET /internal/apm/services/{serviceName}/errors/distribution'>;
interface Props {
    fetchStatus: FETCH_STATUS;
    distribution?: ErrorDistributionAPIResponse;
    title: string;
    tip: string;
    height: number;
}
export declare function ErrorDistribution({ distribution, title, tip, height, fetchStatus }: Props): React.JSX.Element;
export {};
