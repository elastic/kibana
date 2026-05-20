import type { AlertParams, PreviewChartResponse } from '../../route';
import type { APMConfig } from '../../../..';
import type { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getTransactionDurationChartPreview({ alertParams, config, apmEventClient, }: {
    alertParams: AlertParams;
    config: APMConfig;
    apmEventClient: APMEventClient;
}): Promise<PreviewChartResponse>;
