import type { TypeOf } from '@kbn/typed-react-router-config';
import React from 'react';
import type { AgentName } from '../../../../../../typings/es_schemas/ui/fields/agent';
import type { ApmRoutes } from '../../../../routing/apm_route_config';
interface ServiceLinkProps {
    agentName?: AgentName;
    query: TypeOf<ApmRoutes, '/services/{serviceName}/overview'>['query'];
    serviceName: string;
    serviceOverflowCount?: number;
}
export declare function ServiceLink({ agentName, query, serviceName }: ServiceLinkProps): React.JSX.Element;
export {};
