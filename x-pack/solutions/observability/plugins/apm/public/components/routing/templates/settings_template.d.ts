import type { EuiPageHeaderProps } from '@elastic/eui';
import React from 'react';
type Tab = NonNullable<EuiPageHeaderProps['tabs']>[0] & {
    key: 'agent-configuration' | 'agent-keys' | 'anomaly-detection' | 'apm-indices' | 'custom-links' | 'schema' | 'general-settings' | 'agent-explorer';
    hidden?: boolean;
};
interface Props {
    children: React.ReactNode;
    selectedTab: Tab['key'];
}
export declare function SettingsTemplate({ children, selectedTab }: Props): React.JSX.Element;
export {};
