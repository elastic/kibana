import React from 'react';
import type { TypeOf } from '@kbn/typed-react-router-config';
import type { mobileServiceDetailRoute } from '../../../../routing/mobile_service_detail';
interface Props {
    children: React.ReactNode;
    title?: string;
    serviceName: string;
    query: TypeOf<typeof mobileServiceDetailRoute, '/mobile-services/{serviceName}/errors-and-crashes'>['query'];
}
export declare function ErrorOverviewLink({ serviceName, query, ...rest }: Props): React.JSX.Element;
export {};
