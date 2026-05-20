import type { RegisterRuleDependencies } from '../../register_apm_rule_types';
export declare const errorCountActionVariables: ({
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
    name: "errorGroupingKey";
} | {
    description: string;
    name: "errorGroupingName";
} | {
    description: string;
    name: "grouping";
})[];
export declare function registerErrorCountRuleType({ alerting, alertsLocator, basePath, getApmIndices, logger, ruleDataClient, }: RegisterRuleDependencies): void;
