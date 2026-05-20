import type { RegisterRuleDependencies } from '../../register_apm_rule_types';
export declare const transactionErrorRateActionVariables: ({
    description: string;
    name: "alertDetailsUrl";
    usesPublicBaseUrl: boolean;
} | {
    description: string;
    name: "environment";
} | {
    description: string;
    name: "interval";
} | {
    description: string;
    name: "reason";
} | {
    description: string;
    name: "serviceName";
} | {
    description: string;
    name: "threshold";
} | {
    description: string;
    name: "transactionType";
} | {
    description: string;
    name: "transactionName";
} | {
    description: string;
    name: "triggerValue";
} | {
    description: string;
    name: "viewInAppUrl";
    usesPublicBaseUrl: boolean;
} | {
    description: string;
    name: "grouping";
})[];
export declare function registerTransactionErrorRateRuleType({ alerting, alertsLocator, apmConfig, basePath, getApmIndices, logger, ruleDataClient, }: RegisterRuleDependencies): void;
