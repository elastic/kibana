import React from 'react';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
type ServiceNodeReturn = APIReturnType<'GET /internal/apm/service-map/service/{serviceName}'>;
interface StatsListProps {
    isLoading: boolean;
    data: Partial<ServiceNodeReturn>;
}
export declare function StatsList({ data, isLoading }: StatsListProps): React.JSX.Element;
export {};
