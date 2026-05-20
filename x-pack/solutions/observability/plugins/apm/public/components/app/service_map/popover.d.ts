import React from 'react';
import type { Environment } from '../../../../common/environment_rt';
import type { ServiceMapNode, ServiceMapEdge } from '../../../../common/service_map';
interface MapPopoverProps {
    selectedNode: ServiceMapNode | null;
    selectedEdge: ServiceMapEdge | null;
    focusedServiceName?: string;
    environment: Environment;
    kuery: string;
    start: string;
    end: string;
    onClose: () => void;
    /** When true, hides navigation actions like "Focus map" that don't apply in dashboard embeds. */
    isEmbedded?: boolean;
    /** Optional override for the Focus map button visibility. Defaults to `!isEmbedded`. */
    showFocusMap?: boolean;
    /** Focus button always navigates, even for the currently focused service (default re-centers). */
    alwaysNavigateOnFocus?: boolean;
    /** Strip `kuery` from popover-built URLs (env still flows through). */
    clearKueryOnNavigation?: boolean;
}
export declare function MapPopover({ selectedNode, selectedEdge, focusedServiceName, environment, kuery, start, end, onClose, isEmbedded, showFocusMap, alwaysNavigateOnFocus, clearKueryOnNavigation, }: MapPopoverProps): React.JSX.Element;
export {};
