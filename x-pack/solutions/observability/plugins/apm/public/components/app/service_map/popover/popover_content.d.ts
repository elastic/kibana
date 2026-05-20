import type { MouseEvent, ComponentType } from 'react';
import React from 'react';
import type { Environment } from '../../../../../common/environment_rt';
import { type ServiceMapNode, type ServiceMapEdge } from '../../../../../common/service_map';
import { type ServiceMapSelection } from './utils';
export type { ServiceMapSelection } from './utils';
export { isEdge } from './utils';
/**
 * Props for the popover content subcomponents (service, dependency, edge, etc.)
 * They receive the raw React Flow node or edge.
 */
export interface ContentsProps {
    selection: ServiceMapSelection;
    environment: Environment;
    kuery: string;
    start: string;
    end: string;
    onFocusClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
    showDiagnoseButton?: boolean;
    onDiagnoseClick?: () => void;
    isEmbedded?: boolean;
    /** Override for the Focus map button visibility. Defaults to `!isEmbedded`. */
    showFocusMap?: boolean;
    /** Strip `kuery` from popover-built URLs (env still flows through). */
    clearKueryOnNavigation?: boolean;
}
export declare const ServiceContentsWithDiagnose: ComponentType<ContentsProps>;
/**
 * Returns the content component for the given selection (node or edge).
 */
export declare function getContentsComponent(selection: ServiceMapSelection, isDiagnosticModeEnabled: boolean): ComponentType<ContentsProps> | null;
interface PopoverContentProps {
    selectedNode: ServiceMapNode | null;
    selectedEdge: ServiceMapEdge | null;
    environment: Environment;
    kuery: string;
    start: string;
    end: string;
    onFocusClick: (event: MouseEvent<HTMLAnchorElement>) => void;
    /** Called when user clicks "Open diagnostic tool" – parent should open the flyout and close the popover. */
    onOpenDiagnostic?: () => void;
    /** When true, hides navigation actions like "Focus map" that don't apply in dashboard embeds. */
    isEmbedded?: boolean;
    /** Optional override for the Focus map button visibility. Defaults to `!isEmbedded`. */
    showFocusMap?: boolean;
    /** When true, popover-built URLs (Service Details / Focus map) drop `kuery`. See `ContentsProps`. */
    clearKueryOnNavigation?: boolean;
}
/**
 * Popover content for the service map.
 */
export declare function PopoverContent({ selectedNode, selectedEdge, environment, kuery, start, end, onFocusClick, onOpenDiagnostic, isEmbedded, showFocusMap, clearKueryOnNavigation, }: PopoverContentProps): React.JSX.Element | null;
