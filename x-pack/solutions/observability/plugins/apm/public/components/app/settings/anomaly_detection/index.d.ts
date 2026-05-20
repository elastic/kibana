import React from 'react';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
export type AnomalyDetectionApiResponse = APIReturnType<'GET /internal/apm/settings/anomaly-detection/jobs'>;
export declare function AnomalyDetection(): React.JSX.Element;
