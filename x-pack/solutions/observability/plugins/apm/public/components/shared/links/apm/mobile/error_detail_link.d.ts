import React from 'react';
import type { TypeOf } from '@kbn/typed-react-router-config';
import type { mobileServiceDetailRoute } from '../../../../routing/mobile_service_detail';
interface Props {
    children: React.ReactNode;
    title?: string;
    serviceName: string;
    groupId: string;
    query: TypeOf<typeof mobileServiceDetailRoute, '/mobile-services/{serviceName}/errors-and-crashes'>['query'];
}
declare function ErrorDetailLink({ serviceName, groupId, query, ...rest }: Props): React.JSX.Element;
export { ErrorDetailLink };
