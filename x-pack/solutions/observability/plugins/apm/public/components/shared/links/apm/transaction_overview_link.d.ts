import React from 'react';
import type { TypeOf } from '@kbn/typed-react-router-config/src/types';
import type { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import type { APMLinkExtendProps } from './apm_link_hooks';
import type { ApmRoutes } from '../../../routing/apm_route_config';
interface Props extends APMLinkExtendProps {
    serviceName: string;
    latencyAggregationType?: LatencyAggregationType;
    transactionType?: string;
    query: TypeOf<ApmRoutes, '/services/{serviceName}/transactions'>['query'];
}
export declare function TransactionOverviewLink({ serviceName, latencyAggregationType, transactionType, query, ...rest }: Props): React.JSX.Element;
export {};
