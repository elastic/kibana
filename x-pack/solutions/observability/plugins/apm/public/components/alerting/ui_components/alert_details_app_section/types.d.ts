import type { Rule } from '@kbn/alerting-plugin/common';
import type { TopAlert } from '@kbn/observability-plugin/public';
import type { TIME_UNITS } from '@kbn/triggers-actions-ui-plugin/public';
import type { AlertDetailsAppSectionProps as ObsAlertDetailsAppSectionProps } from '@kbn/observability-plugin/public';
import type { ApmRuleType } from '@kbn/rule-data-utils';
import type { AnomalyDetectorType } from '../../../../../common/anomaly_detection/apm_ml_detectors';
import type { ANOMALY_DETECTOR_TYPE, SERVICE_NAME, SERVICE_ENVIRONMENT, TRANSACTION_TYPE, TRANSACTION_NAME, ERROR_GROUP_ID } from '../../../../../common/es_fields/apm';
export type ChartId = 'latency' | 'failedTransactionRate' | 'throughput' | 'errorCount';
interface ChartLayout {
    primary: ChartId;
    secondary: [ChartId, ChartId];
}
export declare const DEFAULT_LAYOUT: ChartLayout;
export declare const CHART_LAYOUTS: Partial<Record<ApmRuleType | AnomalyDetectorType, ChartLayout>>;
export interface AlertDetailsAppSectionProps extends ObsAlertDetailsAppSectionProps {
    rule: Rule<{
        environment: string;
        aggregationType?: string;
        windowSize: number;
        windowUnit: TIME_UNITS;
    }>;
    alert: TopAlert<{
        [ANOMALY_DETECTOR_TYPE]?: string;
        [ERROR_GROUP_ID]?: string;
        [SERVICE_NAME]: string;
        [SERVICE_ENVIRONMENT]: string;
        [TRANSACTION_TYPE]: string;
        [TRANSACTION_NAME]?: string;
    }>;
    timeZone: string;
}
export {};
