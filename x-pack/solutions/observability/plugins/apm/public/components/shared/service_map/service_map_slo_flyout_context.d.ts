import React, { type ReactNode } from 'react';
import type { AgentName } from '@kbn/elastic-agent-utils';
export type ServiceMapSloBadgeClickHandler = (serviceName: string, agentName?: AgentName) => void;
interface ServiceMapSloFlyoutContextValue {
    onSloBadgeClick?: ServiceMapSloBadgeClickHandler;
}
export declare function ServiceMapSloFlyoutProvider({ children, onSloBadgeClick, }: {
    children: ReactNode;
    onSloBadgeClick: ServiceMapSloBadgeClickHandler;
}): React.JSX.Element;
export declare function useServiceMapSloFlyout(): ServiceMapSloFlyoutContextValue;
export {};
