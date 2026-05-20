import React from 'react';
import type { AgentConfiguration, AgentConfigurationIntake } from '../../../../../../../common/agent_configuration/configuration_types';
import type { FetcherResult } from '../../../../../../hooks/use_fetcher';
export declare function SettingsPage({ initialConfig, unsavedChanges, newConfig, setNewConfig, resetSettings, isEditMode, onClickEdit, }: {
    initialConfig?: FetcherResult<AgentConfiguration>;
    unsavedChanges: Record<string, string>;
    newConfig: AgentConfigurationIntake;
    setNewConfig: React.Dispatch<React.SetStateAction<AgentConfigurationIntake>>;
    resetSettings: () => void;
    isEditMode: boolean;
    onClickEdit: () => void;
}): React.JSX.Element;
