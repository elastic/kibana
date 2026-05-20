import type { NotificationsStart } from '@kbn/core/public';
import type { AgentConfigurationIntake } from '../../../../../../../common/agent_configuration/configuration_types';
export declare function saveConfig({ config, isEditMode, toasts, }: {
    config: AgentConfigurationIntake;
    agentName?: string;
    isEditMode: boolean;
    toasts: NotificationsStart['toasts'];
}): Promise<void>;
