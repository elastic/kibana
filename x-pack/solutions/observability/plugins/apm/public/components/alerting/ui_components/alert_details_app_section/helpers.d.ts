import type { ApmRuleType } from '@kbn/rule-data-utils';
import type { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import type { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
export declare const getAggsTypeFromRule: (ruleAggType: string) => LatencyAggregationType;
export declare const isAnomalyRuleType: (ruleTypeId: ApmRuleType) => ruleTypeId is ApmRuleType.Anomaly;
export declare const isErrorCountRuleType: (ruleTypeId: ApmRuleType) => ruleTypeId is ApmRuleType.ErrorCount;
export declare const yLabelFormat: (y?: number | null) => string;
export declare function formatSeverityLabel(alertSeverity: ML_ANOMALY_SEVERITY): string;
export declare function formatAnomalySeverityThreshold(alertEvaluationThreshold: number): string;
