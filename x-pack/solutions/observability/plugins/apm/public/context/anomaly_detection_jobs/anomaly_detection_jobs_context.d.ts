import type { ReactChild } from 'react';
import React from 'react';
import type { AnomalyDetectionSetupState } from '../../../common/anomaly_detection/get_anomaly_detection_setup_state';
import type { FETCH_STATUS } from '../../hooks/use_fetcher';
import type { APIReturnType } from '../../services/rest/create_call_apm_api';
export interface AnomalyDetectionJobsContextValue {
    anomalyDetectionJobsData?: APIReturnType<'GET /internal/apm/settings/anomaly-detection/jobs'>;
    anomalyDetectionJobsStatus: FETCH_STATUS;
    anomalyDetectionJobsRefetch: () => void;
    anomalyDetectionSetupState: AnomalyDetectionSetupState;
}
export declare const AnomalyDetectionJobsContext: React.Context<AnomalyDetectionJobsContextValue>;
export declare function AnomalyDetectionJobsContextProvider({ children }: {
    children: ReactChild;
}): React.JSX.Element;
