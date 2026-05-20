import React from 'react';
import type { TypeOf } from '@kbn/typed-react-router-config';
import type { ApmRoutes } from '../../../routing/apm_route_config';
interface Props {
    children: React.ReactNode;
    title?: string;
    serviceName: string;
    query: TypeOf<ApmRoutes, '/services/{serviceName}/errors'>['query'];
}
export declare function ErrorOverviewLink({ serviceName, query, ...rest }: Props): React.JSX.Element;
export {};
