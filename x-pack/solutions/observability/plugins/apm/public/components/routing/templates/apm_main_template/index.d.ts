import React from 'react';
import type { EuiPageHeaderProps } from '@elastic/eui';
import type { ObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';
export declare function ApmMainTemplate({ pageTitle, pageHeader, children, searchBar, showActionsMenu, showServiceGroupSaveButton, ...pageTemplateProps }: {
    pageTitle?: React.ReactNode;
    pageHeader?: EuiPageHeaderProps;
    children: React.ReactNode;
    searchBar?: React.ReactNode;
    showActionsMenu?: boolean;
    showServiceGroupSaveButton?: boolean;
} & KibanaPageTemplateProps & Pick<ObservabilityPageTemplateProps, 'pageSectionProps'>): React.JSX.Element;
