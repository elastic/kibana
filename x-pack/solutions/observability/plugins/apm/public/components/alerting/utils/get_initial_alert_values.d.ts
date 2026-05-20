import type { ApmRuleType } from '@kbn/rule-data-utils';
export declare function getInitialAlertValues(ruleType: ApmRuleType | null, serviceName: string | undefined): {
    name?: string | undefined;
    tags: string[];
};
