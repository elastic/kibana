/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSideNavItemType, ExclusiveUnion } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';
import type { ApplicationStart } from '../../../../../../../src/core/public';
import {
  KibanaPageTemplate,
  KibanaPageTemplateProps,
} from '../../../../../../../src/plugins/kibana_react/public';
import type { NavigationSection } from '../../../services/navigation_registry';

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
  | 'isEmptyState'
> &
  // recreate the exclusivity of bottomBar-related props
  ExclusiveUnion<
    { template?: 'default' } & Pick<KibanaPageTemplateProps, 'bottomBar' | 'bottomBarProps'>,
    { template: KibanaPageTemplateProps['template'] }
  >;

export interface ObservabilityPageTemplateDependencies {
  currentAppId$: Observable<string | undefined>;
  getUrlForApp: ApplicationStart['getUrlForApp'];
  navigateToApp: ApplicationStart['navigateToApp'];
  navigationSections$: Observable<NavigationSection[]>;
}

export type ObservabilityPageTemplateProps = ObservabilityPageTemplateDependencies &
  WrappedPageTemplateProps;

export function ObservabilityPageTemplate({
  children,
  currentAppId$,
  getUrlForApp,
  navigateToApp,
  navigationSections$,
  ...pageTemplateProps
}: ObservabilityPageTemplateProps): React.ReactElement | null {
  const sections = useObservable(navigationSections$, []);
  const currentAppId = useObservable(currentAppId$, undefined);
  const { pathname: currentPath } = useLocation();

  const sideNavItems = useMemo<Array<EuiSideNavItemType<unknown>>>(
    () =>
      sections.map(({ label, entries }, sectionIndex) => ({
        id: `${sectionIndex}`,
        name: label,
        items: entries.map((entry, entryIndex) => {
          const href = getUrlForApp(entry.app, {
            path: entry.path,
          });

          const isSelected =
            entry.app === currentAppId &&
            matchPath(currentPath, {
              path: entry.path,
              exact: !!entry.matchFullPath,
              strict: !entry.ignoreTrailingSlash,
            }) != null;

          return {
            id: `${sectionIndex}.${entryIndex}`,
            name: entry.label,
            href,
            isSelected,
            onClick: (event) => {
              if (
                event.button !== 0 ||
                event.defaultPrevented ||
                event.metaKey ||
                event.altKey ||
                event.ctrlKey ||
                event.shiftKey
              ) {
                return;
              }

              event.preventDefault();
              navigateToApp(entry.app, {
                path: entry.path,
              });
            },
          };
        }),
      })),
    [currentAppId, currentPath, getUrlForApp, navigateToApp, sections]
  );

  return (
    <KibanaPageTemplate
      restrictWidth={false}
      {...pageTemplateProps}
      solutionNav={{
        icon: 'logoObservability',
        items: sideNavItems,
        name: sideNavTitle,
      }}
    >
      {children}
    </KibanaPageTemplate>
  );
}

// for lazy import
// eslint-disable-next-line import/no-default-export
export default ObservabilityPageTemplate;

const sideNavTitle = i18n.translate('xpack.observability.pageLayout.sideNavTitle', {
  defaultMessage: 'Observability',
});
