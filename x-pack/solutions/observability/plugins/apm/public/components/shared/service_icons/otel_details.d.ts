import React from 'react';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
type ServiceDetailsReturnType = APIReturnType<'GET /internal/apm/services/{serviceName}/metadata/details'>;
interface Props {
    opentelemetry: ServiceDetailsReturnType['opentelemetry'];
}
export declare function OTelDetails({ opentelemetry }: Props): React.JSX.Element | null;
export {};
