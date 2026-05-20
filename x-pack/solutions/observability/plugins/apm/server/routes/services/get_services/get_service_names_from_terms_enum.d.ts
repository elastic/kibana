import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { Environment } from '../../../../common/environment_rt';
export declare function getServiceNamesFromTermsEnum({ apmEventClient, environment, maxNumberOfServices, start, end, }: {
    apmEventClient: APMEventClient;
    environment: Environment;
    maxNumberOfServices: number;
    start: number;
    end: number;
}): Promise<string[]>;
