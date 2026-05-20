import type { TypeOf } from '@kbn/typed-react-router-config';
import React from 'react';
import type { ApmRoutes } from '../../routing/apm_route_config';
interface Props {
    query: TypeOf<ApmRoutes, '/dependencies/overview'>['query'];
    subtype?: string;
    type?: string;
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}
export declare function DependencyLink({ query, subtype, type, onClick }: Props): React.JSX.Element;
export {};
