import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { ServerlessType } from '../../../common/serverless';
export interface ServiceAgentResponse {
    agentName?: string;
    runtimeName?: string;
    runtimeVersion?: string;
    telemetrySdkName?: string;
    telemetrySdkLanguage?: string;
    serverlessType?: ServerlessType;
}
export declare function getServiceAgent({ serviceName, apmEventClient, start, end, }: {
    serviceName: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
}): Promise<ServiceAgentResponse>;
