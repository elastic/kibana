import React from 'react';
import type { TypeOf } from '@kbn/typed-react-router-config';
import type { ApmRoutes } from '../../../routing/apm_route_config';
import type { APMLinkExtendProps } from './apm_link_hooks';
export declare function useMetricOverviewHref(serviceName: string): string;
interface Props extends APMLinkExtendProps {
    serviceName: string;
    query: TypeOf<ApmRoutes, '/services/{serviceName}/metrics'>['query'];
}
export declare function MetricOverviewLink({ serviceName, query, ...rest }: Props): React.JSX.Element;
export {};
