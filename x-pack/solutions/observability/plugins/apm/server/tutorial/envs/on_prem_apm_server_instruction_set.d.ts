import type { InstructionsSchema } from '@kbn/home-plugin/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
export declare function getOnPremApmServerInstructionSet({ apmIndices, isFleetPluginEnabled, }: {
    apmIndices: APMIndices;
    isFleetPluginEnabled: boolean;
}): InstructionsSchema['instructionSets'][0];
