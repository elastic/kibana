import type { ApmFeatureFlagName, ValueOfApmFeatureFlag } from '../../common/apm_feature_flags';
export declare function useApmFeatureFlag<TApmFeatureFlagName extends ApmFeatureFlagName>(featureFlag: TApmFeatureFlagName): ValueOfApmFeatureFlag<TApmFeatureFlagName>;
