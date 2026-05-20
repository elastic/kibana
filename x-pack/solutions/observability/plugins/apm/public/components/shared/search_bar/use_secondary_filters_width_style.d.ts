import type { CSSProperties } from 'react';
export declare function useSecondaryFiltersWidthStyle({ isMedium, enabled, }: {
    isMedium: boolean;
    enabled: boolean;
}): {
    readonly secondaryFiltersWidthStyle: CSSProperties;
    readonly setSearchBarContainerRef: (container: HTMLDivElement | null) => void;
};
