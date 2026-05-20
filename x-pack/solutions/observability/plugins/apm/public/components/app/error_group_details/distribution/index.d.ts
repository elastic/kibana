import React from 'react';
import type { ESQLQueryParams } from '../../../shared/links/discover_links/get_esql_query';
import type { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
type ErrorDistributionAPIResponse = APIReturnType<'GET /internal/apm/services/{serviceName}/errors/distribution'>;
interface DiscoverParams {
    label: string;
    rangeFrom: string;
    rangeTo: string;
    queryParams: ESQLQueryParams;
}
interface Props {
    fetchStatus: FETCH_STATUS;
    distribution?: ErrorDistributionAPIResponse;
    title: React.ReactNode;
    discoverParams?: DiscoverParams;
}
export declare function ErrorDistribution({ distribution, title, fetchStatus, discoverParams }: Props): React.JSX.Element;
export {};
