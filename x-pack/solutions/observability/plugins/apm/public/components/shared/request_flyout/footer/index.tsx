/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EBT_CLICK_ACTIONS } from '@kbn/ebt-click';
import { escapeKuery } from '@kbn/es-query';
import type { FlyoutFooterMenuPanel } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { APM_EBT_ACTIONS } from '../../../app/ebt_constants';
import {
  getFlyoutFooterMenuItem,
  type FlyoutFooterMenuAction,
} from '../../flyout_footer_menu/get_flyout_footer_menu_item';
import { useDiscoverHref } from '../../links/discover_links/use_discover_href';
import { REQUEST_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import { useRequestFlyoutContext } from '../request_flyout_context';

export const REQUEST_FLYOUT_ACTIONS_MENU_PREFIX = 'requestFlyoutActionsMenu';

export const ACTIONS_BUTTON_LABEL = i18n.translate(
  'xpack.apm.requestFlyout.footer.actionsButtonLabel',
  { defaultMessage: 'Actions' }
);

/**
 * The panels of a footer "Actions" menu (`Footer.PrimaryActionMenu`) made of links. Memoize the
 * actions: the menu loses its keyboard focus when it gets new panels on every render.
 */
export function useLinksMenuPanels(
  actions: FlyoutFooterMenuAction[],
  dataTestSubjPrefix: string
): FlyoutFooterMenuPanel[] {
  return useMemo(
    () =>
      actions.length === 0
        ? []
        : [
            {
              id: 0,
              items: actions.map((action) => getFlyoutFooterMenuItem(action, dataTestSubjPrefix)),
            },
          ],
    [actions, dataTestSubjPrefix]
  );
}

/** The "Actions" menu of the request flyout: its dependency in APM, and its traces in Discover. */
export function useRequestFlyoutFooterMenu() {
  const {
    connection: { sourceServiceName, dependencyName },
    filters: { environment, rangeFrom, rangeTo },
  } = useRequestFlyoutContext();

  const { link } = useApmRouter();

  const discoverHref = useDiscoverHref({
    indexType: 'traces',
    rangeFrom,
    rangeTo,
    queryParams: {
      serviceName: sourceServiceName,
      environment,
      dependencyName,
      sortDirection: 'DESC',
    },
  });

  // "Open in APM" is only meaningful when there's a single dependency name.
  const dependencyOverviewHref = dependencyName
    ? link('/dependencies/overview', {
        query: {
          dependencyName,
          environment,
          rangeFrom,
          rangeTo,
          kuery: `service.name:"${escapeKuery(sourceServiceName)}"`,
          comparisonEnabled: false,
        },
      })
    : undefined;

  const actions = useMemo<FlyoutFooterMenuAction[]>(
    () => [
      ...(dependencyOverviewHref
        ? [
            {
              id: 'openInApm',
              name: i18n.translate('xpack.apm.requestFlyout.footer.openInApmLabel', {
                defaultMessage: 'Open in APM',
              }),
              href: dependencyOverviewHref,
              ebt: {
                action: EBT_CLICK_ACTIONS.OPEN_IN_APM,
                element: REQUEST_FLYOUT_EBT_ELEMENTS.ACTIONS_MENU,
              },
            },
          ]
        : []),
      ...(discoverHref
        ? [
            {
              id: 'exploreTraces',
              name: i18n.translate('xpack.apm.requestFlyout.footer.openInDiscoverLabel', {
                defaultMessage: 'Explore traces in Discover',
              }),
              href: discoverHref,
              ebt: {
                action: APM_EBT_ACTIONS.EXPLORE_TRACES,
                element: REQUEST_FLYOUT_EBT_ELEMENTS.ACTIONS_MENU,
              },
            },
          ]
        : []),
    ],
    [dependencyOverviewHref, discoverHref]
  );

  return useLinksMenuPanels(actions, REQUEST_FLYOUT_ACTIONS_MENU_PREFIX);
}
