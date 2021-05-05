/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAvatar, EuiSideNav, EuiSideNavItemType, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { useObservable } from 'react-use';
import type { Observable } from 'rxjs';
import type { ApplicationStart } from '../../../../../../../src/core/public';
import type { NavigationSection } from '../../../services/navigation_registry';
import './side_nav.scss';

export interface ObservabilitySideNavProps {
  currentAppId$: Observable<string | undefined>;
  getUrlForApp: ApplicationStart['getUrlForApp'];
  navigateToApp: ApplicationStart['navigateToApp'];
  navigationSections$: Observable<NavigationSection[]>;
}

export function ObservabilitySideNav({
  currentAppId$,
  getUrlForApp,
  navigateToApp,
  navigationSections$,
}: ObservabilitySideNavProps): React.ReactElement | null {
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
    <>
      <EuiTitle className="observabilitySideBar__header" size="xs">
        <h2>
          <EuiAvatar
            className="observabilitySideBar__headerIcon"
            color="plain"
            iconColor={null}
            iconType="logoObservability"
            name={sideNavTitle}
          />
          {sideNavTitle}
        </h2>
      </EuiTitle>
      <EuiSideNav items={sideNavItems} />
    </>
  );
}

const sideNavTitle = i18n.translate('xpack.observability.sideNav.title', {
  defaultMessage: 'Observability',
});
