import type { ReactNode } from 'react';
import React from 'react';
/**
 * A container for the table. Sets height and flex properties on the EUI Basic
 * Table contained within and the first child div of that. This makes it so the
 * pagination controls always stay fixed at the bottom in the same position.
 *
 * Only do this when we're at a non-mobile breakpoint.
 *
 * Hide the empty message when we don't yet have any items and are still not initiated.
 */
export declare function OverviewTableContainer({ children, fixedHeight, isEmptyAndNotInitiated, }: {
    children?: ReactNode;
    fixedHeight?: boolean;
    isEmptyAndNotInitiated: boolean;
}): React.JSX.Element;
