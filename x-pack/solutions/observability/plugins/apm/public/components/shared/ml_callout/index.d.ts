import React from 'react';
import { AnomalyDetectionSetupState } from '../../../../common/anomaly_detection/get_anomaly_detection_setup_state';
export declare function shouldDisplayMlCallout(anomalyDetectionSetupState: AnomalyDetectionSetupState): anomalyDetectionSetupState is AnomalyDetectionSetupState.NoJobs | AnomalyDetectionSetupState.LegacyJobs | AnomalyDetectionSetupState.UpgradeableJobs;
export declare function MLCallout({ onDismiss, onUpgradeClick, onCreateJobClick, anomalyDetectionSetupState, isOnSettingsPage, }: {
    anomalyDetectionSetupState: AnomalyDetectionSetupState;
    onDismiss?: () => void;
    onUpgradeClick?: () => any;
    onCreateJobClick?: () => void;
    isOnSettingsPage: boolean;
    append?: React.ReactElement;
}): React.JSX.Element | null;
