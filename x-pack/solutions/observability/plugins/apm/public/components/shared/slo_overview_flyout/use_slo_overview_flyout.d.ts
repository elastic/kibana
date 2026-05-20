import type { AgentName } from '@kbn/elastic-agent-utils';
type SloOverviewFlyoutState = {
    serviceName: string;
    agentName?: AgentName;
} | null;
interface SloOverviewFlyoutReturn {
    sloOverviewFlyout: SloOverviewFlyoutState;
    openSloOverviewFlyout: (serviceName: string, agentName?: AgentName) => void;
    closeSloOverviewFlyout: () => void;
}
export declare function useSloOverviewFlyout(initialState?: SloOverviewFlyoutState): SloOverviewFlyoutReturn;
export {};
