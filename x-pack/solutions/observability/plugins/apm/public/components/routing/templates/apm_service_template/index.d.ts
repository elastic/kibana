import React from 'react';
import { SearchBar } from '../../../shared/search_bar/search_bar';
import type { Tab } from './use_tabs';
interface Props {
    title: string;
    children: React.ReactChild;
    selectedTab: Tab['key'];
    searchBarOptions?: React.ComponentProps<typeof SearchBar>;
    customSearchBar?: React.ReactNode;
    bottomHeaderContent?: React.ComponentType;
    contentWrapper?: React.ComponentType<{
        children: React.ReactNode;
    }>;
}
export declare function ApmServiceTemplate(props: Props): React.JSX.Element;
export {};
