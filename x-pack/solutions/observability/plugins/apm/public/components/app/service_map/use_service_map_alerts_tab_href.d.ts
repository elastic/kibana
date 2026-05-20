/**
 * Alerts-tab navigation helpers for the Service Map.
 *
 * The module exposes three related hooks that all resolve the
 * service-scoped alerts-tab destination from the current map route
 * (`/service-map`, `/services/{serviceName}/service-map`, or
 * `/mobile-services/{serviceName}/service-map`) while preserving the
 * shared time range / environment params and **stripping `kuery`** (alerts
 * aggregate across all visible services, so a node-scoped click would
 * otherwise carry the map's service-name filter into a destination where
 * it yields zero results).
 *
 *  - `useServiceMapAlertsTabHref` — returns a plain href for anchor-style use.
 *  - `useServiceMapAlertsTabNavigate` — returns an SPA-navigation click handler.
 *  - `useServiceMapAlertsNavigateFactory` — returns a `MakeAlertsNavigateHandler`
 *    factory injected through `ServiceMapAlertsNavigateProvider` so the shared
 *    `ServiceNode` can produce per-service click handlers without itself
 *    calling `useAnyOfApmParams` (which would throw when the node is rendered
 *    outside an APM map route — e.g. the Agent Builder service map attachment).
 *
 * The three hooks all delegate to `useAlertsTabHrefBuilder` so the
 * kuery-stripping rule is enforced in one place.
 *
 * All three rely on `useAnyOfApmParams` and will throw if called outside a
 * matching APM map route — callers must mount inside `ServiceMapGraph`, which
 * is wrapped by `ApmEmbeddableContext` on dashboard embeds.
 */
import type { KeyboardEvent, MouseEvent } from 'react';
import type { MakeAlertsNavigateHandler } from '../../shared/service_map/service_map_alerts_navigate_context';
/**
 * Alerts tab URL for a service on the service map, matching the service header
 * badge destination for the current map context (global, service detail, mobile).
 */
export declare function useServiceMapAlertsTabHref(serviceName: string): string;
/**
 * SPA navigation to the alerts tab (avoids full page reload from a plain anchor href).
 */
export declare function useServiceMapAlertsTabNavigate(serviceName: string): (e: MouseEvent | KeyboardEvent) => void;
/**
 * Factory used by `ServiceMapAlertsNavigateProvider` to expose a per-service
 * navigate handler to the shared `ServiceNode`. The route-dependent hooks
 * (`useAnyOfApmParams`, `useApmRoutePath`) run once here at the map level
 * — the shared `ServiceNode` itself can't call them because it's also
 * rendered by the Agent Builder service map attachment outside any APM
 * route. Returns `undefined` for a service when SPA navigation isn't
 * available, so callers can degrade to a non-interactive badge.
 */
export declare function useServiceMapAlertsNavigateFactory(): MakeAlertsNavigateHandler;
