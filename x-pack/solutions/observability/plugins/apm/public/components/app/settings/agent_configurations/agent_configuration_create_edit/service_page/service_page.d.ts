import React from 'react';
import type { AgentConfigurationIntake } from '../../../../../../../common/agent_configuration/configuration_types';
interface Props {
    newConfig: AgentConfigurationIntake;
    setNewConfig: React.Dispatch<React.SetStateAction<AgentConfigurationIntake>>;
    onClickNext: () => void;
}
export declare function ServicePage({ newConfig, setNewConfig, onClickNext }: Props): React.JSX.Element;
export {};
