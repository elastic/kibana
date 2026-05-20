import type { AlertParams, PreviewChartResponse } from '../../route';
import type { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getTransactionErrorCountChartPreview({ apmEventClient, alertParams, }: {
    apmEventClient: APMEventClient;
    alertParams: AlertParams;
}): Promise<PreviewChartResponse>;
