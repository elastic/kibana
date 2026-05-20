import type { EuiPageHeaderProps } from '@elastic/eui';
import React from 'react';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';
export declare function ServiceGroupTemplate({ pageTitle, pageHeader, pagePath, children, searchBar, serviceGroupContextTab, ...pageTemplateProps }: {
    pageTitle: string;
    pageHeader?: EuiPageHeaderProps;
    pagePath: string;
    children: React.ReactNode;
    searchBar?: React.ReactNode;
    serviceGroupContextTab: ServiceGroupContextTab['key'];
} & KibanaPageTemplateProps): React.JSX.Element;
type ServiceGroupContextTab = NonNullable<EuiPageHeaderProps['tabs']>[0] & {
    key: 'service-inventory' | 'service-map' | 'service-groups';
    breadcrumbLabel?: string;
};
export {};
