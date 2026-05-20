import React from 'react';
interface HighlightWrapperProps {
    nodeId: string;
    contextHighlight?: boolean;
    children: React.ReactNode;
}
export declare function HighlightWrapper({ nodeId, contextHighlight, children, }: HighlightWrapperProps): React.JSX.Element;
export {};
