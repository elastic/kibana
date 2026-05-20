import React from 'react';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
type ServiceDetailsReturnType = APIReturnType<'GET /internal/apm/services/{serviceName}/metadata/details'>;
interface Props {
    cloud: ServiceDetailsReturnType['cloud'];
    isServerless: boolean;
}
export declare function CloudDetails({ cloud, isServerless }: Props): React.JSX.Element | null;
export {};
