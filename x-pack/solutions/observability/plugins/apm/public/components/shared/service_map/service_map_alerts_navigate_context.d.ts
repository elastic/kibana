import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import React from 'react';
export type ServiceMapAlertsNavigateHandler = (e: MouseEvent | KeyboardEvent) => void;
/**
 * Factory that returns a per-service alerts-tab navigate handler.
 *
 * Modeled as a factory (rather than a single direct callback like the SLO
 * flyout context) because the provider's underlying hooks
 * (`useApmRouter`, `useAnyOfApmParams`, ...) are route-dependent and must be
 * called once at the map level — not per node — to stay compliant with the
 * Rules of Hooks. The factory closes over those values and returns a fresh
 * callback for each `serviceName` the shared `ServiceNode` asks about.
 */
export type MakeAlertsNavigateHandler = (serviceName: string) => ServiceMapAlertsNavigateHandler | undefined;
export declare function ServiceMapAlertsNavigateProvider({ children, makeAlertsNavigateHandler, }: {
    children: ReactNode;
    makeAlertsNavigateHandler: MakeAlertsNavigateHandler;
}): React.JSX.Element;
export declare function useServiceMapAlertsNavigate(serviceName: string): ServiceMapAlertsNavigateHandler | undefined;
