/**
 * Fields to exclude as potential field candidates
 */
export declare const FIELDS_TO_EXCLUDE_AS_CANDIDATE: Set<string>;
export declare const FIELD_PREFIX_TO_EXCLUDE_AS_CANDIDATE: string[];
/**
 * Fields to include/prioritize as potential field candidates
 */
export declare const FIELDS_TO_ADD_AS_CANDIDATE: Set<string>;
export declare const FIELD_PREFIX_TO_ADD_AS_CANDIDATE: string[];
/**
 * Other constants
 */
export declare const PERCENTILES_STEP = 2;
export declare const TERMS_SIZE = 20;
export declare const SIGNIFICANT_FRACTION = 3;
export declare const SIGNIFICANT_VALUE_DIGITS = 3;
export declare const CORRELATION_THRESHOLD = 0.3;
export declare const KS_TEST_THRESHOLD = 0.1;
export declare const ERROR_CORRELATION_THRESHOLD = 0.02;
export declare const DEFAULT_PERCENTILE_THRESHOLD = 95;
export declare const DEBOUNCE_INTERVAL = 100;
