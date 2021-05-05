/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate, EuiPageTemplateProps, ExclusiveUnion } from '@elastic/eui';
import React from 'react';
import type { Observable } from 'rxjs';
import type { NavigationSection } from '../../../services/navigation_registry';
import { ObservabilitySideNav } from './side_nav';

export type WrappedPageTemplateProps = Pick<
  EuiPageTemplateProps,
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
    { template?: 'default' } & Pick<EuiPageTemplateProps, 'bottomBar' | 'bottomBarProps'>,
    { template: EuiPageTemplateProps['template'] }
  >;

export type ObservabilityPageTemplateProps = {
  navigationSections$: Observable<NavigationSection[]>;
} & WrappedPageTemplateProps;

export function ObservabilityPageTemplate({
  children,
  navigationSections$,
  ...pageTemplateProps
}: ObservabilityPageTemplateProps): React.ReactElement | null {
  return (
    <EuiPageTemplate
      restrictWidth={false}
      {...pageTemplateProps}
      pageSideBar={<ObservabilitySideNav navigationSections$={navigationSections$} />}
    >
      {children}
    </EuiPageTemplate>
  );
}

// for lazy import
// eslint-disable-next-line import/no-default-export
export default ObservabilityPageTemplate;
