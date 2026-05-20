import type { Transaction } from '../../typings/es_schemas/ui/transaction';
export declare const INVALID_LICENSE: string;
export declare const NO_PERMISSION_LABEL: string;
export declare const extractTemplateVariableNames: (url: string) => string[];
export declare function getEncodedCustomLinkUrl(url: string, transaction?: Transaction): string;
