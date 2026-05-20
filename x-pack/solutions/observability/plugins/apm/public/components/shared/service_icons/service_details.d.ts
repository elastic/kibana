import React from 'react';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
type ServiceDetailsReturnType = APIReturnType<'GET /internal/apm/services/{serviceName}/metadata/details'>;
interface Props {
    service: ServiceDetailsReturnType['service'];
}
export declare function ServiceDetails({ service }: Props): React.JSX.Element | null;
export {};
