import React from 'react';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
export declare function ServiceLogs(): React.JSX.Element;
export declare function getInfrastructureFilter({ containerIds, environment, serviceName, }: {
    containerIds: string[];
    environment: string;
    serviceName: string;
}): QueryDslQueryContainer;
export declare function getServiceShouldClauses({ environment, serviceName, }: {
    environment: string;
    serviceName: string;
}): QueryDslQueryContainer[];
export declare function getContainerShouldClauses({ containerIds, }: {
    containerIds: string[];
}): QueryDslQueryContainer[];
