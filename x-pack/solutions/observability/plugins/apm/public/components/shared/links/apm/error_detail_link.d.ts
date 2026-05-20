import React from 'react';
import type { TypeOf } from '@kbn/typed-react-router-config';
import type { APMLinkExtendProps } from './apm_link_hooks';
import type { ApmRoutes } from '../../../routing/apm_route_config';
interface Props extends APMLinkExtendProps {
    serviceName: string;
    errorGroupId: string;
    query: TypeOf<ApmRoutes, '/services/{serviceName}/errors/{groupId}'>['query'];
}
declare function ErrorDetailLink({ serviceName, errorGroupId, query, ...rest }: Props): React.JSX.Element;
export { ErrorDetailLink };
