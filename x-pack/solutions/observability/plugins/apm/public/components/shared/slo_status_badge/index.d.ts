import type { MouseEventHandler } from 'react';
import React from 'react';
import type { SloStatus } from '../../../../common/service_inventory';
export declare const SLO_COUNT_CAP = 50;
export declare function SloStatusBadge({ sloStatus, sloCount, serviceName, onClick, hideTooltip, compactLabelOnNarrowScreens, }: {
    sloStatus: SloStatus | 'noSLOs';
    sloCount?: number;
    serviceName: string;
    /** When omitted, the badge is display-only (e.g. service map static badges). */
    onClick?: MouseEventHandler<HTMLButtonElement>;
    /** When true, no EuiToolTip (e.g. service map). Inventory and other callers omit this. */
    hideTooltip?: boolean;
    /**
     * When true and the status shows a numeric count, xs/s viewports show icon + count only
     * (full label from `m` breakpoint up) to avoid wrapping on the service map.
     */
    compactLabelOnNarrowScreens?: boolean;
}): React.JSX.Element;
