import React from 'react';
interface SearchHighlightState {
    matchNodeIds: Set<string>;
    activeMatchNodeId: string | null;
}
interface ServiceMapSearchContextValue {
    setSearchHighlight: (state: SearchHighlightState) => void;
    matchNodeIds: Set<string>;
    activeMatchNodeId: string | null;
}
export declare function ServiceMapSearchProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
export declare const useServiceMapSearchContext: () => ServiceMapSearchContextValue;
export declare const useServiceMapSearchHighlight: (nodeId: string) => {
    isSearchMatch: boolean;
    isActiveSearchMatch: boolean;
};
export {};
