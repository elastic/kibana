import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
declare const hasOTelMetrics: ({ kuery, apmEventClient, serviceName, environment, start, end, }: {
    kuery: string;
    apmEventClient: APMEventClient;
    serviceName: string;
    environment: string;
    start: number;
    end: number;
}) => Promise<boolean>;
export { hasOTelMetrics };
