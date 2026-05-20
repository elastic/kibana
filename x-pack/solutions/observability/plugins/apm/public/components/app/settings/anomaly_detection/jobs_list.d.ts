import React from 'react';
import type { AnomalyDetectionSetupState } from '../../../../../common/anomaly_detection/get_anomaly_detection_setup_state';
import type { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import type { AnomalyDetectionApiResponse } from '.';
interface Props {
    data: AnomalyDetectionApiResponse;
    setupState: AnomalyDetectionSetupState;
    status: FETCH_STATUS;
    onAddEnvironments: () => void;
    onUpdateComplete: () => void;
}
export declare function JobsList({ data, status, onAddEnvironments, setupState, onUpdateComplete }: Props): React.JSX.Element;
export {};
