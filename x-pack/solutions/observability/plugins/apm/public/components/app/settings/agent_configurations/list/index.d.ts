import React from 'react';
import type { APIReturnType } from '../../../../../services/rest/create_call_apm_api';
import type { FETCH_STATUS } from '../../../../../hooks/use_fetcher';
type Config = APIReturnType<'GET /api/apm/settings/agent-configuration 2023-10-31'>['configurations'][0];
interface Props {
    status: FETCH_STATUS;
    configurations: Config[];
    refetch: () => void;
}
export declare function AgentConfigurationList({ status, configurations, refetch }: Props): React.JSX.Element;
export {};
