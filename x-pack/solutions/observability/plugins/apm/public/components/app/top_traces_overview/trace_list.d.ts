import type { TypeOf } from '@kbn/typed-react-router-config';
import React from 'react';
import type { ApmRoutes } from '../../routing/apm_route_config';
import type { FetcherResult } from '../../../hooks/use_fetcher';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
import type { ITableColumn } from '../../shared/managed_table';
interface Props {
    response: FetcherResult<APIReturnType<'GET /internal/apm/traces'>>;
}
type TraceGroup = Required<Props['response']>['data']['items'][number];
export declare function getTraceListColumns({ query, link, }: {
    query: TypeOf<ApmRoutes, '/traces'>['query'];
    link: (path: '/services/{serviceName}/transactions/view', params: {
        path: {
            serviceName: string;
        };
        query: TypeOf<ApmRoutes, '/services/{serviceName}/transactions/view'>['query'];
    }) => string;
}): Array<ITableColumn<TraceGroup>>;
export declare function TraceList({ response }: Props): React.JSX.Element;
export {};
