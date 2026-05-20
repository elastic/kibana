import type { FETCH_STATUS } from '../../public/hooks/use_fetcher';
import type { APIReturnType } from '../../public/services/rest/create_call_apm_api';
export declare enum AnomalyDetectionSetupState {
    Loading = "pending",
    Failure = "failure",
    Unknown = "unknown",
    NoJobs = "noJobs",
    NoJobsForEnvironment = "noJobsForEnvironment",
    LegacyJobs = "legacyJobs",
    UpgradeableJobs = "upgradeableJobs",
    UpToDate = "upToDate"
}
export declare function getAnomalyDetectionSetupState({ environment, jobs, fetchStatus, isAuthorized, }: {
    environment: string;
    jobs: APIReturnType<'GET /internal/apm/settings/anomaly-detection/jobs'>['jobs'];
    fetchStatus: FETCH_STATUS;
    isAuthorized: boolean;
}): AnomalyDetectionSetupState;
