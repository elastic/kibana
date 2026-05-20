import React from 'react';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
type ServiceDetailsReturnType = APIReturnType<'GET /internal/apm/services/{serviceName}/metadata/details'>;
interface Props {
    container: ServiceDetailsReturnType['container'];
    kubernetes: ServiceDetailsReturnType['kubernetes'];
}
export declare function ContainerDetails({ container, kubernetes }: Props): React.JSX.Element | null;
export {};
