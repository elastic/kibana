import React from 'react';
import type { SettingDefinition } from '../../../../../../../common/agent_configuration/setting_definitions/types';
export declare function SettingFormRow({ isUnsaved, setting, value, onChange, }: {
    isUnsaved: boolean;
    setting: SettingDefinition;
    value?: string;
    onChange: ({ key, value }: {
        key: string;
        value: string;
    }) => void;
}): React.JSX.Element;
