import React from 'react';
import type { SavedServiceGroup } from '../../../../../common/service_groups';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
interface Props {
    items: SavedServiceGroup[];
    serviceGroupCounts: APIReturnType<'GET /internal/apm/service-group/counts'>;
    isLoading: boolean;
}
export declare function ServiceGroupsListItems({ items, serviceGroupCounts, isLoading }: Props): React.JSX.Element;
export {};
