import type { MlAnomalyDetectors, MlMlSystem, MlModules } from '@kbn/ml-plugin/server';
import type { MinimalAPMRouteHandlerResources } from '../../routes/apm_routes/register_apm_server_routes';
export interface MlClient {
    mlSystem: MlMlSystem;
    anomalyDetectors: MlAnomalyDetectors;
    modules: MlModules;
}
export declare function getMlClient({ plugins, context, request, }: Pick<MinimalAPMRouteHandlerResources, 'plugins' | 'context' | 'request'>): Promise<{
    mlSystem: {
        mlCapabilities(): Promise<import("@kbn/ml-common-types/capabilities").MlCapabilitiesResponse>;
        mlInfo(): Promise<import("@kbn/ml-common-types/ml_server_info").MlInfoResponse>;
        mlAnomalySearch<T>(searchParams: any, jobIds: string[]): Promise<import("@elastic/elasticsearch/lib/api/types").SearchResponse<T>>;
    };
    anomalyDetectors: {
        jobs(jobId?: string): Promise<{
            count: number;
            jobs: import("@kbn/ml-plugin/server").MlJob[];
        }>;
        jobStats(jobId?: string): Promise<{
            count: number;
            jobs: import("@kbn/ml-common-types/anomaly_detection_jobs/job_stats").JobStats[];
        }>;
        datafeeds(datafeedId?: string): Promise<{
            count: number;
            datafeeds: import("@kbn/ml-common-types/anomaly_detection_jobs/datafeed").Datafeed[];
        }>;
        datafeedStats(datafeedId?: string): Promise<{
            count: number;
            datafeeds: import("@kbn/ml-plugin/server").MlDatafeedStats[];
        }>;
    };
    modules: {
        recognize: import("../../../../../../../platform/plugins/shared/ml/server/models/data_recognizer").DataRecognizer["findMatches"];
        getModule: import("../../../../../../../platform/plugins/shared/ml/server/models/data_recognizer").DataRecognizer["getModule"];
        listModules: import("../../../../../../../platform/plugins/shared/ml/server/models/data_recognizer").DataRecognizer["listModules"];
        setup(payload: import("../../../../../../../platform/plugins/shared/ml/server/shared").ModuleSetupPayload): ReturnType<import("../../../../../../../platform/plugins/shared/ml/server/models/data_recognizer").DataRecognizer["setup"]>;
    };
} | undefined>;
