import React from 'react';
import type { TypeOf } from '@kbn/typed-react-router-config';
import type { ApmRoutes } from '../../routing/apm_route_config';
type Query = TypeOf<ApmRoutes, '/dependencies/operation'>['query'];
export declare function DependencyOperationDetailLink(query: Query): React.JSX.Element;
export {};
