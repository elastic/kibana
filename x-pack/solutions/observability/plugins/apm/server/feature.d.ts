import type { LicenseType } from '@kbn/licensing-types';
import type { LicensingPluginSetup, LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
export declare const APM_FEATURE: KibanaFeatureConfig;
interface Feature {
    name: string;
    license: LicenseType;
}
type FeatureName = 'serviceMaps' | 'ml' | 'customLinks';
export declare const features: Record<FeatureName, Feature>;
export declare function registerFeaturesUsage({ licensingPlugin, }: {
    licensingPlugin: LicensingPluginSetup;
}): void;
export declare function notifyFeatureUsage({ licensingPlugin, featureName, }: {
    licensingPlugin: LicensingApiRequestHandlerContext;
    featureName: FeatureName;
}): void;
export {};
