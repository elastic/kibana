import type { EuiBasicTableColumn } from '@elastic/eui';
import React from 'react';
import type { ValuesType } from 'utility-types';
import type { TypeOf } from '@kbn/typed-react-router-config';
import type { AgentName } from '../../../../../../../typings/es_schemas/ui/fields/agent';
import type { APIReturnType } from '../../../../../../services/rest/create_call_apm_api';
import type { ApmRoutes } from '../../../../../routing/apm_route_config';
type AgentExplorerInstance = ValuesType<APIReturnType<'GET /internal/apm/services/{serviceName}/agent_instances'>['items']>;
interface GetInstanceColumnsProps {
    serviceName: string;
    agentName: AgentName;
    query: Omit<TypeOf<ApmRoutes, '/services/{serviceName}/metrics'>['query'], 'kuery'>;
    agentDocsPageUrl?: string;
}
export declare function getInstanceColumns({ serviceName, agentName, query, agentDocsPageUrl, }: GetInstanceColumnsProps): Array<EuiBasicTableColumn<AgentExplorerInstance>>;
interface Props {
    serviceName: string;
    agentName: AgentName;
    agentDocsPageUrl?: string;
    environment: string;
    items: AgentExplorerInstance[];
    isLoading: boolean;
    start: string;
    end: string;
}
export declare function AgentInstancesDetails({ serviceName, agentName, start, end, agentDocsPageUrl, items, isLoading, }: Props): React.JSX.Element;
export {};
