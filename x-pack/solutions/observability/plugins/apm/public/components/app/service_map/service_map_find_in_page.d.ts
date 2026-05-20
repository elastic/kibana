import React from 'react';
import type { ServiceMapNode } from '../../../../common/service_map';
export declare const SERVICE_MAP_FIND_INPUT_ID = "serviceMapFindInPageInput";
export interface ServiceMapFindInPageProps {
    nodes: ServiceMapNode[];
}
/**
 * Find-in-page for the service map: filters visible service/dependency nodes, centers the canvas on
 * matches, and keeps `selectedIndex` aligned with the last centered match (so prev/next stay in sync).
 */
export declare function ServiceMapFindInPage({ nodes }: ServiceMapFindInPageProps): React.JSX.Element;
/** Focus the find input (e.g. after Cmd+K). */
export declare function focusServiceMapFindInput(): void;
