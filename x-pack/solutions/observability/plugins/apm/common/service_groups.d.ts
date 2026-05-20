export type { ServiceGroup, SavedServiceGroup } from '@kbn/apm-types';
export declare const LABELS = "labels";
export declare const APM_SERVICE_GROUP_SAVED_OBJECT_TYPE = "apm-service-group";
export declare const MAX_NUMBER_OF_SERVICE_GROUPS = 500;
export declare const SERVICE_GROUP_SUPPORTED_FIELDS: string[];
export declare function isSupportedField(fieldName: string): boolean;
export declare function validateServiceGroupKuery(kuery: string): {
    isValidFields: boolean;
    isValidSyntax: boolean;
    message?: string;
};
