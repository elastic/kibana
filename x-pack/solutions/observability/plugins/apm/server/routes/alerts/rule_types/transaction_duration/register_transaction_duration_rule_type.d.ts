import type { RegisterRuleDependencies } from '../../register_apm_rule_types';
export declare const transactionDurationActionVariables: ({
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
export declare function registerTransactionDurationRuleType({ alerting, apmConfig, getApmIndices, basePath, }: RegisterRuleDependencies): void;
