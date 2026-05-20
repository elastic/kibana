import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { Agent } from '../../../typings/es_schemas/ui/fields/agent';
import type { Service } from '../../../typings/es_schemas/raw/fields/service';
import type { Container } from '../../../typings/es_schemas/raw/fields/container';
import type { Kubernetes } from '../../../typings/es_schemas/raw/fields/kubernetes';
import type { Host } from '../../../typings/es_schemas/raw/fields/host';
import type { Cloud } from '../../../typings/es_schemas/raw/fields/cloud';
export interface ServiceInstanceMetadataDetailsResponse {
    '@timestamp': string;
    agent?: Agent;
    service?: Service;
    container?: Container;
    kubernetes?: Kubernetes;
    host?: Host;
    cloud?: Cloud;
}
export declare function getServiceInstanceMetadataDetails({ serviceName, serviceNodeName, apmEventClient, start, end, }: {
    serviceName: string;
    serviceNodeName: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
}): Promise<ServiceInstanceMetadataDetailsResponse>;
