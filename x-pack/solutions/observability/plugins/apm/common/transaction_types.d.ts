export declare const TRANSACTION_REQUEST = "request";
export declare const defaultTransactionTypes: string[];
export declare function getDefaultTransactionType(agentName?: string): "request" | "mobile" | "page-load";
export declare function isDefaultTransactionType(transactionType: string): boolean;
