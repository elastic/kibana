import React from 'react';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
type ServiceDetailsReturnType = APIReturnType<'GET /internal/apm/services/{serviceName}/metadata/details'>;
interface Props {
    serverless: ServiceDetailsReturnType['serverless'];
}
export declare function ServerlessDetails({ serverless }: Props): React.JSX.Element | null;
export {};
