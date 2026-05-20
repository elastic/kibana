import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { TimeseriesChangePoint } from '../get_apm_timeseries';
export interface ChangePointGrouping {
    title: string;
    grouping: string;
    changes: TimeseriesChangePoint[];
}
export declare function getServiceChangePoints({ apmEventClient, start, end, serviceName, serviceEnvironment, transactionType, transactionName, }: {
    apmEventClient: APMEventClient;
    start: string;
    end: string;
    serviceName: string | undefined;
    serviceEnvironment: string | undefined;
    transactionType: string | undefined;
    transactionName: string | undefined;
}): Promise<ChangePointGrouping[]>;
export declare function getExitSpanChangePoints({ apmEventClient, start, end, serviceName, serviceEnvironment, }: {
    apmEventClient: APMEventClient;
    start: string;
    end: string;
    serviceName: string | undefined;
    serviceEnvironment: string | undefined;
}): Promise<ChangePointGrouping[]>;
