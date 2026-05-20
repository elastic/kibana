import type { TutorialSchema } from '@kbn/home-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
export declare function createElasticCloudInstructions({ cloudSetup, apmIndices, isFleetPluginEnabled, isManagedOtlpServiceFeatureEnabled, managedOtlpServiceUrl, }: {
    cloudSetup?: CloudSetup;
    apmIndices: APMIndices;
    isFleetPluginEnabled: boolean;
    isManagedOtlpServiceFeatureEnabled: boolean;
    managedOtlpServiceUrl: string;
}): TutorialSchema['elasticCloud'];
