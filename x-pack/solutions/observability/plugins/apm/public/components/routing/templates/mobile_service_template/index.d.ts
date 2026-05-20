import type { EuiPageHeaderProps } from '@elastic/eui';
import React from 'react';
import { MobileSearchBar } from '../../../app/mobile/search_bar';
type Tab = NonNullable<EuiPageHeaderProps['tabs']>[0] & {
    key: 'overview' | 'transactions' | 'dependencies' | 'errors-and-crashes' | 'service-map' | 'logs' | 'alerts' | 'dashboards';
    hidden?: boolean;
};
interface Props {
    title: string;
    children: React.ReactChild;
    selectedTabKey: Tab['key'];
    searchBarOptions?: React.ComponentProps<typeof MobileSearchBar>;
    customSearchBar?: React.ReactNode;
    bottomHeaderContent?: React.ComponentType;
    contentWrapper?: React.ComponentType<{
        children: React.ReactNode;
    }>;
}
export declare function MobileServiceTemplate(props: Props): React.JSX.Element;
export {};
