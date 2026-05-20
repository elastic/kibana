import type * as t from 'io-ts';
import type { SettingValidation } from '../setting_definitions/types';
export declare const serviceRt: t.PartialC<{
    name: t.StringC;
    environment: t.StringC;
}>;
export declare const settingsRt: t.IntersectionC<[t.RecordC<t.StringC, t.StringC>, t.PartialC<Record<string, SettingValidation>>]>;
export declare const agentConfigurationIntakeRt: t.IntersectionC<[t.PartialC<{
    agent_name: t.StringC;
}>, t.TypeC<{
    service: t.PartialC<{
        name: t.StringC;
        environment: t.StringC;
    }>;
    settings: t.IntersectionC<[t.RecordC<t.StringC, t.StringC>, t.PartialC<Record<string, SettingValidation>>]>;
}>]>;
