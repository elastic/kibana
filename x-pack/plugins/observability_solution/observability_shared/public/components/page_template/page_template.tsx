/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSideNavItemType, EuiPageSectionProps, EuiEmptyPromptProps } from '@elastic/eui';
import { _EuiPageBottomBarProps } from '@elastic/eui/src/components/page_template/bottom_bar/page_bottom_bar';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';
import type { BehaviorSubject, Observable } from 'rxjs';
import type { ApplicationStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import {
  KibanaPageTemplate,
  KibanaPageTemplateKibanaProvider,
} from '@kbn/shared-ux-page-kibana-template';
import type {
  KibanaPageTemplateProps,
  KibanaPageTemplateKibanaDependencies,
} from '@kbn/shared-ux-page-kibana-template';
import { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import { SearchBarPortal } from './search_bar_portal';
import { ObservabilityTour } from '../tour';
import { NavNameWithBadge, hideBadge } from './nav_name_with_badge';
import { NavNameWithBetaBadge } from './nav_name_with_beta_badge';

export type WrappedPageTemplateProps = Pick<
  KibanaPageTemplateProps,
  'children' | 'data-test-subj' | 'pageHeader' | 'restrictWidth' | 'isEmptyState' | 'noDataConfig'
> & {
  showSolutionNav?: boolean;
  isPageDataLoaded?: boolean;
  pageSectionProps?: EuiPageSectionProps;
  bottomBar?: React.ReactNode;
  bottomBarProps?: _EuiPageBottomBarProps;
  topSearchBar?: React.ReactNode;
} & Pick<EuiEmptyPromptProps, 'paddingSize'>;

export interface NavigationEntry {
  // the label of the menu entry, should be translated
  label: string;
  // the kibana app id
  app: string;
  // the path after the application prefix corresponding to this entry
  path: string;
  // whether to only match when the full path matches, defaults to `false`
  matchFullPath?: boolean;
  // whether to ignore trailing slashes, defaults to `true`
  ignoreTrailingSlash?: boolean;
  // handler to be called when the item is clicked
  onClick?: (event: React.MouseEvent<HTMLElement | HTMLButtonElement, MouseEvent>) => void;
  // shows NEW badge besides the navigation label, which will automatically disappear when menu item is clicked.
  isNewFeature?: boolean;
  // shows technical preview lab icon if the feature is still in technical preview besides the navigation label
  isTechnicalPreview?: boolean;
  // shows beta badge besides the navigation label
  isBetaFeature?: boolean;
  // override default path matching logic to determine if nav entry is selected
  matchPath?: (path: string) => boolean;
}

export interface NavigationSection {
  // the label of the section, should be translated
  label: string | undefined;
  // the key to sort by in ascending order relative to other entries
  sortKey: number;
  // the entries to render inside the section
  entries: NavigationEntry[];
  // shows beta badge besides the navigation label
  isBetaFeature?: boolean;
}

export interface ObservabilityPageTemplateDependencies {
  currentAppId$: Observable<string | undefined>;
  getUrlForApp: ApplicationStart['getUrlForApp'];
  navigateToApp: ApplicationStart['navigateToApp'];
  navigationSections$: Observable<NavigationSection[]>;
  getPageTemplateServices: () => KibanaPageTemplateKibanaDependencies;
  guidedOnboardingApi: GuidedOnboardingPluginStart['guidedOnboardingApi'];
  isSidebarEnabled$: BehaviorSubject<boolean>;
}

export type ObservabilityPageTemplateProps = Omit<
  ObservabilityPageTemplateDependencies,
  'isSidebarEnabled$'
> &
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
  topSearchBar,
  ...pageTemplateProps
}: ObservabilityPageTemplateProps): React.ReactElement | null {
  const sections = useObservable(navigationSections$, []);
  const currentAppId = useObservable(currentAppId$, undefined);
  const { pathname: currentPath } = useLocation();

  const { services } = useKibana();

  const sideNavItems = useMemo<Array<EuiSideNavItemType<unknown>>>(
    () =>
      sections.map(({ label, entries, isBetaFeature }, sectionIndex) => ({
        id: `${sectionIndex}`,
        name: isBetaFeature ? <NavNameWithBetaBadge label={label} /> : label,
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
            name: entry.isBetaFeature ? (
              <NavNameWithBetaBadge label={entry.label} />
            ) : entry.isNewFeature ? (
              <NavNameWithBadge label={entry.label} localStorageId={badgeLocalStorageId} />
            ) : entry.isTechnicalPreview ? (
              <NavNameWithBetaBadge
                label={entry.label}
                iconType="beaker"
                isTechnicalPreview={true}
              />
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
              <KibanaErrorBoundaryProvider analytics={services.analytics}>
                <KibanaErrorBoundary>
                  <KibanaPageTemplate.Section
                    component="div"
                    alignment={pageTemplateProps.isEmptyState ? 'center' : 'top'}
                    {...pageSectionProps}
                  >
                    {topSearchBar && <SearchBarPortal>{topSearchBar}</SearchBarPortal>}
                    {children}
                  </KibanaPageTemplate.Section>
                </KibanaErrorBoundary>
              </KibanaErrorBoundaryProvider>
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

const sideNavTitle = i18n.translate('xpack.observabilityShared.pageLayout.sideNavTitle', {
  defaultMessage: 'Observability',
});

export const LazyObservabilityPageTemplate = React.lazy(() => import('./page_template'));

export type LazyObservabilityPageTemplateProps = WrappedPageTemplateProps;

export function createLazyObservabilityPageTemplate(
  injectedDeps: ObservabilityPageTemplateDependencies
) {
  return (pageTemplateProps: LazyObservabilityPageTemplateProps) => (
    <React.Suspense fallback={null}>
      <LazyObservabilityPageTemplate {...pageTemplateProps} {...injectedDeps} />
    </React.Suspense>
  );
}
