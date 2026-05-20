import type { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import type { SettingDefinition } from './types';
export declare function filterByAgent(agentName?: AgentName): (setting: SettingDefinition) => boolean;
export declare function validateSetting(setting: SettingDefinition, value: unknown): {
    isValid: boolean;
    message: string;
};
export declare const settingDefinitions: SettingDefinition[];
