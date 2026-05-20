import React from 'react';
import type { ServiceNodeData } from '../../../../common/service_map';
interface Props {
    nodeData: ServiceNodeData;
}
/**
 * Alert and SLO badges next to the service map popover title — same behaviour as
 * {@link ServiceNode} badges on the map.
 */
export declare function ServiceMapPopoverTitleBadges({ nodeData }: Props): React.JSX.Element | null;
export {};
