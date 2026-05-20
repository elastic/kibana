import type { Environment } from '../../../common/environment_rt';
import { EventOutcome } from '../../../common/event_outcome';
import type { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export interface DependencySpan {
    '@timestamp': number;
    spanId: string;
    spanName: string;
    serviceName: string;
    agentName: AgentName;
    traceId: string;
    transactionId?: string;
    transactionType?: string;
    transactionName?: string;
    duration: number;
    outcome: EventOutcome;
}
export declare function getTopDependencySpans({ apmEventClient, dependencyName, spanName, start, end, environment, kuery, sampleRangeFrom, sampleRangeTo, }: {
    apmEventClient: APMEventClient;
    dependencyName: string;
    spanName: string;
    start: number;
    end: number;
    environment: Environment;
    kuery: string;
    sampleRangeFrom?: number;
    sampleRangeTo?: number;
}): Promise<DependencySpan[]>;
