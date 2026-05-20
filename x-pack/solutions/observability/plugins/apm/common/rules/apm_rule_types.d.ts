import type { ValuesType } from 'utility-types';
import type { AsDuration, AsPercent } from '@kbn/observability-plugin/common';
import type { ActionGroup } from '@kbn/alerting-plugin/common';
import type { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import type { ML_ANOMALY_THRESHOLD } from '@kbn/ml-anomaly-utils/anomaly_threshold';
import type { ApmRuleType } from '@kbn/rule-data-utils';
import type { ErrorCountRuleParams } from '@kbn/response-ops-rule-params/error_count';
import type { TransactionDurationRuleParams } from '@kbn/response-ops-rule-params/transaction_duration';
import type { AnomalyRuleParams } from '@kbn/response-ops-rule-params/apm_anomaly';
import type { TransactionErrorRateRuleParams } from '@kbn/response-ops-rule-params/transaction_error_rate';
import type { AnomalyDetectorType } from '../anomaly_detection/apm_ml_detectors';
export { AggregationType } from '@kbn/apm-types';
export declare const APM_SERVER_FEATURE_ID = "apm";
export interface ApmRuleParamsType {
    [ApmRuleType.TransactionDuration]: TransactionDurationRuleParams;
    [ApmRuleType.ErrorCount]: ErrorCountRuleParams;
    [ApmRuleType.Anomaly]: AnomalyRuleParams;
    [ApmRuleType.TransactionErrorRate]: TransactionErrorRateRuleParams;
}
export declare const THRESHOLD_MET_GROUP_ID = "threshold_met";
export type ThresholdMetActionGroupId = typeof THRESHOLD_MET_GROUP_ID;
export declare const THRESHOLD_MET_GROUP: ActionGroup<ThresholdMetActionGroupId>;
export declare const getFieldValueLabel: (field: string, fieldValue: string) => string;
export declare function formatErrorCountReason({ threshold, measured, windowSize, windowUnit, groupByFields, }: {
    threshold: number;
    measured: number;
    windowSize: number;
    windowUnit: string;
    groupByFields: Record<string, string>;
}): string;
export declare function formatTransactionDurationReason({ threshold, measured, asDuration, aggregationType, windowSize, windowUnit, groupByFields, }: {
    threshold: number;
    measured: number;
    asDuration: AsDuration;
    aggregationType: string;
    windowSize: number;
    windowUnit: string;
    groupByFields: Record<string, string>;
}): string;
export declare function formatTransactionErrorRateReason({ threshold, measured, asPercent, windowSize, windowUnit, groupByFields, }: {
    threshold: number;
    measured: number;
    asPercent: AsPercent;
    windowSize: number;
    windowUnit: string;
    groupByFields: Record<string, string>;
}): string;
export declare function formatAnomalyReason({ serviceName, severityLevel, anomalyScore, windowSize, windowUnit, detectorType, }: {
    serviceName: string;
    severityLevel: string;
    anomalyScore: number;
    windowSize: number;
    windowUnit: string;
    detectorType: AnomalyDetectorType;
}): string;
export declare const RULE_TYPES_CONFIG: Record<ApmRuleType, {
    name: string;
    actionGroups: Array<ActionGroup<ThresholdMetActionGroupId>>;
    defaultActionGroupId: ThresholdMetActionGroupId;
    minimumLicenseRequired: string;
    isExportable: boolean;
    producer: string;
}>;
export declare const ANOMALY_ALERT_SEVERITY_TYPES: readonly [{
    readonly type: ML_ANOMALY_SEVERITY.CRITICAL;
    readonly label: string;
    readonly threshold: ML_ANOMALY_THRESHOLD.CRITICAL;
}, {
    readonly type: ML_ANOMALY_SEVERITY.MAJOR;
    readonly label: string;
    readonly threshold: ML_ANOMALY_THRESHOLD.MAJOR;
}, {
    readonly type: ML_ANOMALY_SEVERITY.MINOR;
    readonly label: string;
    readonly threshold: ML_ANOMALY_THRESHOLD.MINOR;
}, {
    readonly type: ML_ANOMALY_SEVERITY.WARNING;
    readonly label: string;
    readonly threshold: ML_ANOMALY_THRESHOLD.WARNING;
}];
export type AnomalyAlertSeverityType = ValuesType<typeof ANOMALY_ALERT_SEVERITY_TYPES>['type'];
export declare function getApmMlDetectorLabel(type: AnomalyDetectorType): string;
export declare const ANOMALY_DETECTOR_SELECTOR_OPTIONS: {
    type: AnomalyDetectorType;
    label: string;
}[];
export interface AdditionalContext {
    [x: string]: any;
}
