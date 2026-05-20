import type { TypeOf } from '@kbn/config-schema';
import type { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import type { ApmRuleType } from '@kbn/rule-data-utils';
import type { AnomalyDetectorType } from '../anomaly_detection/apm_ml_detectors';
import type { AggregationType } from './apm_rule_types';
export declare const searchConfigurationSchema: import("@kbn/config-schema").ObjectType<{
    query: import("@kbn/config-schema").ObjectType<{
        query: import("@kbn/config-schema").Type<string | Record<string, any>>;
        language: import("@kbn/config-schema").Type<string>;
    }>;
}>;
export declare const errorCountParamsSchema: import("@kbn/config-schema").ObjectType<{
    windowSize: import("@kbn/config-schema").Type<number>;
    windowUnit: import("@kbn/config-schema").Type<string>;
    threshold: import("@kbn/config-schema").Type<number>;
    serviceName: import("@kbn/config-schema").Type<string | undefined>;
    environment: import("@kbn/config-schema").Type<string>;
    groupBy: import("@kbn/config-schema").Type<string[] | undefined>;
    errorGroupingKey: import("@kbn/config-schema").Type<string | undefined>;
    useKqlFilter: import("@kbn/config-schema").Type<boolean | undefined>;
    searchConfiguration: import("@kbn/config-schema").Type<Readonly<{} & {
        query: Readonly<{} & {
            query: string | Record<string, any>;
            language: string;
        }>;
    }> | undefined>;
}>;
export declare const transactionDurationParamsSchema: import("@kbn/config-schema").ObjectType<{
    serviceName: import("@kbn/config-schema").Type<string | undefined>;
    transactionType: import("@kbn/config-schema").Type<string | undefined>;
    transactionName: import("@kbn/config-schema").Type<string | undefined>;
    windowSize: import("@kbn/config-schema").Type<number>;
    windowUnit: import("@kbn/config-schema").Type<string>;
    threshold: import("@kbn/config-schema").Type<number>;
    aggregationType: import("@kbn/config-schema").Type<AggregationType>;
    environment: import("@kbn/config-schema").Type<string>;
    groupBy: import("@kbn/config-schema").Type<string[] | undefined>;
    useKqlFilter: import("@kbn/config-schema").Type<boolean | undefined>;
    searchConfiguration: import("@kbn/config-schema").Type<Readonly<{} & {
        query: Readonly<{} & {
            query: string | Record<string, any>;
            language: string;
        }>;
    }> | undefined>;
}>;
export declare const anomalyParamsSchema: import("@kbn/config-schema").ObjectType<{
    serviceName: import("@kbn/config-schema").Type<string | undefined>;
    transactionType: import("@kbn/config-schema").Type<string | undefined>;
    windowSize: import("@kbn/config-schema").Type<number>;
    windowUnit: import("@kbn/config-schema").Type<string>;
    environment: import("@kbn/config-schema").Type<string>;
    anomalySeverityType: import("@kbn/config-schema").Type<ML_ANOMALY_SEVERITY.CRITICAL | ML_ANOMALY_SEVERITY.MAJOR | ML_ANOMALY_SEVERITY.MINOR | ML_ANOMALY_SEVERITY.WARNING>;
    anomalyDetectorTypes: import("@kbn/config-schema").Type<AnomalyDetectorType[] | undefined>;
}>;
export declare const transactionErrorRateParamsSchema: import("@kbn/config-schema").ObjectType<{
    windowSize: import("@kbn/config-schema").Type<number>;
    windowUnit: import("@kbn/config-schema").Type<string>;
    threshold: import("@kbn/config-schema").Type<number>;
    transactionType: import("@kbn/config-schema").Type<string | undefined>;
    transactionName: import("@kbn/config-schema").Type<string | undefined>;
    serviceName: import("@kbn/config-schema").Type<string | undefined>;
    environment: import("@kbn/config-schema").Type<string>;
    groupBy: import("@kbn/config-schema").Type<string[] | undefined>;
    useKqlFilter: import("@kbn/config-schema").Type<boolean | undefined>;
    searchConfiguration: import("@kbn/config-schema").Type<Readonly<{} & {
        query: Readonly<{} & {
            query: string | Record<string, any>;
            language: string;
        }>;
    }> | undefined>;
}>;
type ErrorCountParamsType = TypeOf<typeof errorCountParamsSchema>;
type TransactionDurationParamsType = TypeOf<typeof transactionDurationParamsSchema>;
type AnomalyParamsType = TypeOf<typeof anomalyParamsSchema>;
type TransactionErrorRateParamsType = TypeOf<typeof transactionErrorRateParamsSchema>;
export type SearchConfigurationType = TypeOf<typeof searchConfigurationSchema>;
export interface ApmRuleParamsType {
    [ApmRuleType.TransactionDuration]: TransactionDurationParamsType;
    [ApmRuleType.ErrorCount]: ErrorCountParamsType;
    [ApmRuleType.Anomaly]: AnomalyParamsType;
    [ApmRuleType.TransactionErrorRate]: TransactionErrorRateParamsType;
}
export {};
