import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { Environment } from '../../../common/environment_rt';
export interface ServiceMapEmbeddableProps {
    rangeFrom: string;
    rangeTo: string;
    environment?: Environment;
    kuery?: string;
    serviceName?: string;
    serviceGroupId?: string;
    core: CoreStart;
    onBlockingError?: (error: Error | undefined) => void;
    /** Separate range for the badges query. Defaults to `[rangeFrom, rangeTo]`. */
    badgesRangeFrom?: string;
    badgesRangeTo?: string;
    /** KQL for the badges query only. Defaults to `kuery`. Pass `""` to aggregate across all nodes. */
    badgesKuery?: string;
    /** Show the popover's "Focus map" button in embedded contexts. Defaults to `!isEmbedded`. */
    showFocusMapInPopover?: boolean;
    /** Strip `kuery` from popover-built URLs ("Service Details" / "Focus map"); env still flows through. */
    clearKueryOnPopoverNavigation?: boolean;
    /** Focus button always navigates to standalone APM, even for the currently focused service. */
    alwaysNavigateOnPopoverFocus?: boolean;
    /** Drop cross-env spans before rendering when env is set. */
    strictEnvironmentScope?: boolean;
    /** Fires when the topology is definitively empty (`SUCCESS && nodes.length === 0`). */
    onEmptyStateChange?: (isEmpty: boolean) => void;
    /** Field-value pairs to pass as filter bar pills in the "View full map" link instead of kuery. */
    filterPills?: Array<{
        field: string;
        value: string;
    }>;
}
export declare function ServiceMapEmbeddable({ rangeFrom, rangeTo, environment, kuery, serviceName, serviceGroupId, core, onBlockingError, badgesRangeFrom, badgesRangeTo, badgesKuery, showFocusMapInPopover, clearKueryOnPopoverNavigation, alwaysNavigateOnPopoverFocus, strictEnvironmentScope, onEmptyStateChange, filterPills, }: ServiceMapEmbeddableProps): React.JSX.Element | null;
