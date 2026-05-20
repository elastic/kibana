/** Use with `feature_flags.overrides` in kibana.yml to toggle CPS integration for APM. */
export declare const OBSERVABILITY_APM_CPS_ENABLED_FEATURE_FLAG: "observability.apm.cpsEnabled";
/**
 * Fallback when the flag is unset and no override exists (same default as the removed
 * `xpack.apm.featureFlags.apmCPSEnabled` setting).
 */
export declare const OBSERVABILITY_APM_CPS_ENABLED_DEFAULT = true;
