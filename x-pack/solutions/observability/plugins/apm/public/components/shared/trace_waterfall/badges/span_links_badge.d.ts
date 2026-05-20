import React from 'react';
interface Props {
    incomingCount: number;
    outgoingCount: number;
    id: string;
    onClick?: (flyoutDetailTab: string) => unknown;
}
export declare function SpanLinksBadge({ outgoingCount, incomingCount, id, onClick }: Props): React.JSX.Element | null;
export {};
