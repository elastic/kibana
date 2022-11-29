/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSideNavItemType, EuiPageSectionProps } from '@elastic/eui';
import { _EuiPageBottomBarProps } from '@elastic/eui/src/components/page_template/bottom_bar/page_bottom_bar';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';
import type { ApplicationStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  KibanaPageTemplate,
  KibanaPageTemplateKibanaProvider,
} from '@kbn/shared-ux-page-kibana-template';
import type {
  KibanaPageTemplateProps,
  KibanaPageTemplateKibanaDependencies,
} from '@kbn/shared-ux-page-kibana-template';
import { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import { ObservabilityAppServices } from '../../../application/types';
import type { NavigationSection } from '../../../services/navigation_registry';
import { ObservabilityTour } from '../tour';
import { NavNameWithBadge, hideBadge } from './nav_name_with_badge';

export type WrappedPageTemplateProps = Pick<
  KibanaPageTemplateProps,
  | 'children'
  | 'data-test-subj'
  | 'paddingSize'
  | 'pageHeader'
  | 'restrictWidth'
  | 'isEmptyState'
  | 'noDataConfig'
> & {
  showSolutionNav?: boolean;
  isPageDataLoaded?: boolean;
  pageSectionProps?: EuiPageSectionProps;
  bottomBar?: React.ReactNode;
  bottomBarProps?: _EuiPageBottomBarProps;
};

export interface ObservabilityPageTemplateDependencies {
  currentAppId$: Observable<string | undefined>;
  getUrlForApp: ApplicationStart['getUrlForApp'];
  navigateToApp: ApplicationStart['navigateToApp'];
  navigationSections$: Observable<NavigationSection[]>;
  getPageTemplateServices: () => KibanaPageTemplateKibanaDependencies;
  guidedOnboardingApi: GuidedOnboardingPluginStart['guidedOnboardingApi'];
}

export type ObservabilityPageTemplateProps = ObservabilityPageTemplateDependencies &
  WrappedPageTemplateProps;

export function ObservabilityPageTemplate({
  children,
  currentAppId$,
  getUrlForApp,
  navigateToApp,
  navigationSections$,
  showSolutionNav = true,
  isPageDataLoaded = true,
  getPageTemplateServices,
  bottomBar,
  bottomBarProps,
  pageSectionProps,
  guidedOnboardingApi,
  ...pageTemplateProps
}: ObservabilityPageTemplateProps): React.ReactElement | null {
  const sections = useObservable(navigationSections$, []);
  const currentAppId = useObservable(currentAppId$, undefined);
  const { pathname: currentPath } = useLocation();

  const { services } = useKibana<ObservabilityAppServices>();

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
            (entry.matchPath
              ? entry.matchPath(currentPath)
              : matchPath(currentPath, {
                  path: entry.path,
                  exact: !!entry.matchFullPath,
                  strict: !entry.ignoreTrailingSlash,
                }) != null);
          const badgeLocalStorageId = `observability.nav_item_badge_visible_${entry.app}${entry.path}`;
          const navId = entry.label.toLowerCase().split(' ').join('_');
          return {
            id: `${sectionIndex}.${entryIndex}`,
            name: entry.isNewFeature ? (
              <NavNameWithBadge label={entry.label} localStorageId={badgeLocalStorageId} />
            ) : (
              entry.label
            ),
            href,
            isSelected,
            'data-nav-id': navId,
            'data-test-subj': `observability-nav-${entry.app}-${navId}`,
            onClick: (event) => {
              if (entry.onClick) {
                entry.onClick(event);
              }

              // Hides NEW badge when the item is clicked
              if (entry.isNewFeature) {
                hideBadge(badgeLocalStorageId);
              }

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
    <KibanaPageTemplateKibanaProvider {...getPageTemplateServices()}>
      <ObservabilityTour
        navigateToApp={navigateToApp}
        prependBasePath={services?.http?.basePath.prepend}
        guidedOnboardingApi={guidedOnboardingApi}
        isPageDataLoaded={isPageDataLoaded}
        // The tour is dependent on the solution nav, and should not render if it is not visible
        showTour={showSolutionNav}
      >
        {({ isTourVisible }) => {
          return (
            <KibanaPageTemplate
              restrictWidth={false}
              {...pageTemplateProps}
              solutionNav={
                showSolutionNav
                  ? {
                      icon: 'logoObservability',
                      items: sideNavItems,
                      name: sideNavTitle,
                      // Only false if tour is active
                      canBeCollapsed: isTourVisible === false,
                    }
                  : undefined
              }
            >
              <KibanaPageTemplate.Section
                component="div"
                alignment={pageTemplateProps.isEmptyState ? 'center' : 'top'}
                {...pageSectionProps}
              >
                {children}
              </KibanaPageTemplate.Section>
              {bottomBar && (
                <KibanaPageTemplate.BottomBar {...bottomBarProps}>
                  {bottomBar}
                </KibanaPageTemplate.BottomBar>
              )}
            </KibanaPageTemplate>
          );
        }}
      </ObservabilityTour>
    </KibanaPageTemplateKibanaProvider>
  );
}

// for lazy import
// eslint-disable-next-line import/no-default-export
export default ObservabilityPageTemplate;

const sideNavTitle = i18n.translate('xpack.observability.pageLayout.sideNavTitle', {
  defaultMessage: 'Observability',
});
