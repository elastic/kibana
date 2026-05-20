import React from 'react';
import '@xyflow/react/dist/style.css';
import type { Environment } from '../../../../common/environment_rt';
import { type ServiceMapNode, type ServiceMapEdge as ServiceMapEdgeType } from '../../../../common/service_map';
interface GraphProps {
    height: number | string;
    nodes: ServiceMapNode[];
    edges: ServiceMapEdgeType[];
    /** Currently focused service name (for service-specific map) */
    serviceName?: string;
    environment: Environment;
    kuery: string;
    start: string;
    end: string;
    isFullscreen?: boolean;
    onToggleFullscreen?: () => void;
    /** When set, shows a "View full service map" button that links to the full map (focused map only) */
    fullMapHref?: string;
    /** When true, hides minimap, options panel, and navigation actions that don't apply in dashboard embeds. */
    isEmbedded?: boolean;
    /** Override for the popover's Focus map button visibility. Defaults to `!isEmbedded`. */
    showFocusMap?: boolean;
    /** Focus button always navigates, even for the currently focused service. */
    alwaysNavigateOnPopoverFocus?: boolean;
    /** Strip `kuery` from popover-built URLs (env still flows through). */
    clearKueryOnPopoverNavigation?: boolean;
    /**
     * When set to a service name that exists on the map, that node gets context highlight
     * (frame, fill, primary node ring). Blue edges/markers remain tied to explicit selection only.
     */
    highlightedServiceName?: string;
}
export declare function ServiceMapGraph(props: GraphProps): React.JSX.Element;
export {};
