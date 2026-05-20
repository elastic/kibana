import React from 'react';
import type { SettingDefinition } from '../../../../../../../common/agent_configuration/setting_definitions/types';
import type { AgentConfigurationIntake } from '../../../../../../../common/agent_configuration/configuration_types';
export declare function AdvancedConfiguration({ newConfig, settingsDefinitions, revalidate, onChange, onDelete, addNewRow, addValidationError, removeValidationError, }: {
    newConfig: AgentConfigurationIntake;
    settingsDefinitions: SettingDefinition[];
    revalidate: boolean;
    onChange: ({ key, value, oldKey }: {
        key: string;
        value?: string;
        oldKey?: string;
    }) => void;
    onDelete: (key: string, index: number) => void;
    addNewRow: () => void;
    addValidationError: (key: string, active: boolean) => void;
    removeValidationError: (key: string) => void;
}): React.JSX.Element;
