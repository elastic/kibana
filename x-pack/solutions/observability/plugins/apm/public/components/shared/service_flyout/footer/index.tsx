/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import type { FlyoutFooterMenuItem, FlyoutFooterMenuPanel } from '@kbn/flyout-template';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import type { EbtClickAttrs } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { MouseEvent } from 'react';
import { useMemo } from 'react';
import { isLeftClick, isModifiedClick } from '../../../../utils/mouse_event';
import { SERVICE_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import { useServiceFlyoutLinks } from '../hooks/use_service_flyout_links';
import { useServiceFlyoutContext } from '../service_flyout_context';

const DATA_TEST_SUBJ_PREFIX = 'serviceFlyoutActionsMenu';

interface LeafAction {
  id: string;
  name: string;
  href?: string;
  onClick?: () => void;
  ebt?: EbtClickAttrs;
}

/**
 * Resolves a menu item's navigation props. A combined href + onClick runs the handler on a plain
 * left-click and otherwise follows the href (e.g. cmd-click opens a new tab).
 */
function getItemNavigation(href?: string, onClick?: () => void) {
  if (href && onClick) {
    return {
      href,
      onClick: (e: MouseEvent) => {
        if (!isLeftClick(e) || isModifiedClick(e)) return;
        e.preventDefault();
        onClick();
      },
    };
  }
  if (href) {
    return { href, target: '_self' as const };
  }
  return { onClick };
}

export interface ServiceFlyoutFooterMenu {
  panels: FlyoutFooterMenuPanel[];
  isLoading: boolean;
  hasActions: boolean;
}

/**
 * Resolves the service flyout footer "Actions" menu as `Footer.PrimaryActionMenu` panels. The item
 * test subjects match the pre-template menu (`serviceFlyoutActionsMenuItem-*`) so existing callers
 * and tests keep working.
 */
export function useServiceFlyoutFooterMenu(): ServiceFlyoutFooterMenu {
  const { euiTheme } = useEuiTheme();
  const { capabilities } = useServiceFlyoutContext();
  const {
    apm: { overviewTab: serviceOverviewHref },
    alerts: alertsHref,
    slos: slosHref,
    discover: {
      traces: { href: tracesDiscoverHref, openInDiscoverTab: tracesOpenInDiscoverTab },
      logs: { href: logsDiscoverHref, openInDiscoverTab: logsOpenInDiscoverTab },
    },
  } = useServiceFlyoutLinks();

  const showServiceOverview = Boolean(
    serviceOverviewHref && (capabilities.header?.serviceNameLink ?? false)
  );
  const showAlerts = Boolean(alertsHref && capabilities.footer?.alerts);
  const showSlos = Boolean(slosHref && capabilities.footer?.slos);

  const hasActions =
    showServiceOverview ||
    Boolean(tracesDiscoverHref) ||
    Boolean(logsDiscoverHref) ||
    showAlerts ||
    showSlos;

  const panels = useMemo<FlyoutFooterMenuPanel[]>(() => {
    const items: FlyoutFooterMenuItem[] = [];

    const makeItem = ({ id, name, href, onClick, ebt }: LeafAction): FlyoutFooterMenuItem => ({
      name,
      ...getItemNavigation(href, onClick),
      ...(ebt ? getEbtProps(ebt) : {}),
      'data-test-subj': `${DATA_TEST_SUBJ_PREFIX}Item-${id}`,
    });

    const pushGroupLabel = (groupId: string, label: string) => {
      items.push({
        name: label,
        disabled: true,
        css: {
          fontWeight: 700,
          color: euiTheme.colors.text,
          marginTop: items.length > 0 ? euiTheme.size.m : 0,
        },
        'data-test-subj': `${DATA_TEST_SUBJ_PREFIX}Group-${groupId}`,
      });
    };

    if (showServiceOverview) {
      items.push(
        makeItem({
          id: 'openServiceOverview',
          name: i18n.translate('xpack.apm.serviceFlyout.openServiceOverviewAction', {
            defaultMessage: 'Open service overview',
          }),
          href: serviceOverviewHref,
          ebt: {
            action: EBT_CLICK_ACTIONS.VIEW_SERVICE,
            element: SERVICE_FLYOUT_EBT_ELEMENTS.ACTIONS_MENU,
            detail: 'overview',
          },
        })
      );
    }

    if (tracesDiscoverHref) {
      items.push(
        makeItem({
          id: 'openTracesInDiscover',
          name: tracesOpenInDiscoverTab
            ? i18n.translate('xpack.apm.serviceFlyout.openTracesInDiscoverTabAction', {
                defaultMessage: 'Open traces in a Discover tab',
              })
            : i18n.translate('xpack.apm.serviceFlyout.openTracesInDiscoverAction', {
                defaultMessage: 'Open traces in Discover',
              }),
          href: tracesDiscoverHref,
          onClick: tracesOpenInDiscoverTab,
          ebt: {
            action: EBT_CLICK_ACTIONS.OPEN_IN_DISCOVER,
            element: SERVICE_FLYOUT_EBT_ELEMENTS.ACTIONS_MENU,
            detail: 'traces',
          },
        })
      );
    }

    if (logsDiscoverHref) {
      items.push(
        makeItem({
          id: 'openLogsInDiscover',
          name: logsOpenInDiscoverTab
            ? i18n.translate('xpack.apm.serviceFlyout.openLogsInDiscoverTabAction', {
                defaultMessage: 'Open logs in a Discover tab',
              })
            : i18n.translate('xpack.apm.serviceFlyout.openLogsInDiscoverAction', {
                defaultMessage: 'Open logs in Discover',
              }),
          href: logsDiscoverHref,
          onClick: logsOpenInDiscoverTab,
          ebt: {
            action: EBT_CLICK_ACTIONS.OPEN_IN_DISCOVER,
            element: SERVICE_FLYOUT_EBT_ELEMENTS.ACTIONS_MENU,
            detail: 'logs',
          },
        })
      );
    }

    if (showAlerts) {
      pushGroupLabel(
        'alerts',
        i18n.translate('xpack.apm.serviceFlyout.alertsActionsGroupLabel', {
          defaultMessage: 'Alerts',
        })
      );
      items.push(
        makeItem({
          id: 'openAlerts',
          name: i18n.translate('xpack.apm.serviceFlyout.openAlertsAction', {
            defaultMessage: 'Open in Alerts',
          }),
          href: alertsHref,
          ebt: {
            action: EBT_CLICK_ACTIONS.VIEW_ALERTS,
            element: SERVICE_FLYOUT_EBT_ELEMENTS.ACTIONS_MENU,
          },
        })
      );
    }

    if (showSlos) {
      pushGroupLabel(
        'slos',
        i18n.translate('xpack.apm.serviceFlyout.sloActionsGroupLabel', {
          defaultMessage: 'SLOs',
        })
      );
      items.push(
        makeItem({
          id: 'openSlos',
          name: i18n.translate('xpack.apm.serviceFlyout.openSlosAction', {
            defaultMessage: 'Open in SLOs',
          }),
          href: slosHref,
          ebt: {
            action: EBT_CLICK_ACTIONS.VIEW_SLOS,
            element: SERVICE_FLYOUT_EBT_ELEMENTS.ACTIONS_MENU,
          },
        })
      );
    }

    return [{ id: 0, items }];
  }, [
    euiTheme,
    showServiceOverview,
    serviceOverviewHref,
    tracesDiscoverHref,
    tracesOpenInDiscoverTab,
    logsDiscoverHref,
    logsOpenInDiscoverTab,
    showAlerts,
    alertsHref,
    showSlos,
    slosHref,
  ]);

  return { panels, isLoading: capabilities.loading, hasActions };
}
