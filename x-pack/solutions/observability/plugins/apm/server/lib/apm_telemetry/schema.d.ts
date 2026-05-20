import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { APMUsage, APMPerService, APMPerAgentConfigSettings } from './types';
export declare const apmPerAgentConfigSettingsSchema: MakeSchemaFrom<APMPerAgentConfigSettings, true>;
export declare const apmPerServiceSchema: MakeSchemaFrom<APMPerService, true>;
export declare const apmSchema: MakeSchemaFrom<APMUsage, true>;
