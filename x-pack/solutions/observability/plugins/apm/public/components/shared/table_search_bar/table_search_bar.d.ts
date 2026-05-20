import React from 'react';
interface Props {
    placeholder: string;
    searchQuery: string;
    isLoading?: boolean;
    onChangeSearchQuery: (value: string) => void;
    techPreview?: boolean;
}
export declare function TableSearchBar({ placeholder, searchQuery, onChangeSearchQuery, isLoading, techPreview, }: Props): React.JSX.Element;
export declare function getItemsFilteredBySearchQuery<T, P extends keyof T>({ items, fieldsToSearch, searchQuery, }: {
    items: T[];
    fieldsToSearch: P[];
    searchQuery: string;
}): T[];
export {};
