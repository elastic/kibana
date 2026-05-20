export declare const DEFAULT_GROUP_BY_TRANSACTION_DURATION: readonly ["service.name", "service.environment", "transaction.type", "transaction.name"];
export declare const DEFAULT_GROUP_BY_TRANSACTION_ERROR_RATE: readonly ["service.name", "service.environment", "transaction.type", "transaction.name"];
export declare const DEFAULT_GROUP_BY_ERROR_COUNT: readonly ["service.name", "service.environment", "transaction.name"];
export declare const getAllGroupByFields: (ruleType: string, ruleParamsGroupByFields?: string[] | undefined) => string[];
