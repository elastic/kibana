import type { TutorialSchema } from '@kbn/home-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type { ObservabilityPluginSetup } from '@kbn/observability-plugin/server';
import type { APMConfig } from '..';
export declare const tutorialProvider: ({ apmConfig, apmIndices, cloud, isFleetPluginEnabled, observability, isManagedOtlpServiceFeatureEnabled, managedOtlpServiceUrl, }: {
    apmConfig: APMConfig;
    apmIndices: APMIndices;
    cloud?: CloudSetup;
    observability: ObservabilityPluginSetup;
    isFleetPluginEnabled: boolean;
    isManagedOtlpServiceFeatureEnabled: boolean;
    managedOtlpServiceUrl: string;
}) => () => TutorialSchema;
