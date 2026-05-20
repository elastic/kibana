import React from 'react';
import type { AgentName } from '@kbn/elastic-agent-utils';
interface Props {
    serviceName: string;
    agentName?: AgentName;
    onClose: () => void;
}
export declare function SloOverviewFlyout({ serviceName, agentName, onClose }: Props): React.JSX.Element;
export { useSloOverviewFlyout } from './use_slo_overview_flyout';
