import type { TypeOf } from '@kbn/typed-react-router-config';
import React from 'react';
import type { Error } from '@kbn/apm-types';
import type { ApmRoutes } from '../../../../routing/apm_route_config';
import type { Mark } from '.';
export interface ErrorMark extends Mark {
    type: 'errorMark';
    error: Error;
    serviceColor: string;
    onClick?: () => void;
}
interface Props {
    mark: ErrorMark;
    query?: TypeOf<ApmRoutes, '/services/{serviceName}/errors/{groupId}'>['query'];
}
export declare function ErrorMarker({ mark, query }: Props): React.JSX.Element;
export {};
