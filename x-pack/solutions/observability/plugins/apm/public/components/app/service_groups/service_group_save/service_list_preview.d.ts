import React from 'react';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
type ServiceListAPIResponse = APIReturnType<'GET /internal/apm/service-group/services'>;
type Items = ServiceListAPIResponse['items'];
interface Props {
    items: Items;
    isLoading: boolean;
}
export declare function ServiceListPreview({ items, isLoading }: Props): React.JSX.Element;
export {};
