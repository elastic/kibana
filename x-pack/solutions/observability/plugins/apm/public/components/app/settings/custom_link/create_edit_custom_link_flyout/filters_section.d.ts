import React from 'react';
import type { Filter } from '../../../../../../common/custom_link/custom_link_types';
export declare function FiltersSection({ filters, setFilters, }: {
    filters: Filter[];
    setFilters: (filters: Filter[]) => void;
}): React.JSX.Element;
export declare function AddFilterButton({ onClick, isDisabled, }: {
    onClick: () => void;
    isDisabled: boolean;
}): React.JSX.Element;
