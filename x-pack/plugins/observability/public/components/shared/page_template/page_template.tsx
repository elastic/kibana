/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExclusiveUnion } from '@elastic/eui';
import React from 'react';
import {
  KibanaPageTemplate,
  KibanaPageTemplateProps,
} from '../../../../../../../src/plugins/kibana_react/public';
import { ObservabilitySideNav, ObservabilitySideNavProps } from './side_nav';
import './side_nav.scss';

export type WrappedPageTemplateProps = Pick<
  KibanaPageTemplateProps,
  | 'children'
  | 'data-test-subj'
  | 'paddingSize'
  | 'pageBodyProps'
  | 'pageContentBodyProps'
  | 'pageContentProps'
  | 'pageHeader'
  | 'restrictWidth'
> &
  // recreate the exclusivity of bottomBar-related props
  ExclusiveUnion<
    { template?: 'default' } & Pick<KibanaPageTemplateProps, 'bottomBar' | 'bottomBarProps'>,
    { template: KibanaPageTemplateProps['template'] }
  >;

export type ObservabilityPageTemplateProps = ObservabilitySideNavProps & WrappedPageTemplateProps;

export function ObservabilityPageTemplate({
  children,
  currentAppId$,
  getUrlForApp,
  navigateToApp,
  navigationSections$,
  ...pageTemplateProps
}: ObservabilityPageTemplateProps): React.ReactElement | null {
  return (
    <KibanaPageTemplate
      restrictWidth={false}
      {...pageTemplateProps}
      pageSideBar={
        <ObservabilitySideNav
          currentAppId$={currentAppId$}
          getUrlForApp={getUrlForApp}
          navigateToApp={navigateToApp}
          navigationSections$={navigationSections$}
        />
      }
      pageSideBarProps={{
        className: 'observabilitySideBar',
        sticky: true,
      }}
    >
      {children}
    </KibanaPageTemplate>
  );
}

// for lazy import
// eslint-disable-next-line import/no-default-export
export default ObservabilityPageTemplate;
