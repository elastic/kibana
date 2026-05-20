import React, { type ReactNode } from 'react';
import type { Position } from '@xyflow/react';
interface DiamondNodeProps {
    id: string;
    label: string;
    spanType?: string;
    spanSubtype?: string;
    selected?: boolean;
    sourcePosition?: Position;
    targetPosition?: Position;
    testSubjPrefix: string;
    iconAltFallback: string;
    badge?: ReactNode;
    ariaLabel?: string;
    groupedCount?: number;
}
export declare const DiamondNode: React.MemoExoticComponent<({ id, label, spanType, spanSubtype, selected, sourcePosition, targetPosition, testSubjPrefix, iconAltFallback, badge, ariaLabel: customAriaLabel, groupedCount, }: DiamondNodeProps) => React.JSX.Element>;
export {};
