import type { AlertParams, PreviewChartResponse } from '../../route';
import type { APMConfig } from '../../../..';
import type { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getTransactionErrorRateChartPreview({ config, apmEventClient, alertParams, }: {
    config: APMConfig;
    apmEventClient: APMEventClient;
    alertParams: AlertParams;
}): Promise<PreviewChartResponse>;
