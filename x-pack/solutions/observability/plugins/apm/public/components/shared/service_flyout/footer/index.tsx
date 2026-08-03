/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiFlyoutFooter } from '@elastic/eui';
import { EBT_CLICK_ACTIONS } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { ActionsContextMenu, type ActionGroups } from '../../actions_context_menu';
import { SERVICE_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import { useServiceFlyoutLinks } from '../hooks/use_service_flyout_links';

export function ServiceFlyoutFooter() {
  const {
    alerts: alertsHref,
    slos: slosHref,
    discover: { traces: tracesDiscoverHref, logs: logsDiscoverHref },
  } = useServiceFlyoutLinks();

  const actionGroups = useMemo(() => {
    const groups: ActionGroups = [];

    if (tracesDiscoverHref || logsDiscoverHref) {
      groups.push({
        id: 'discover',
        actions: [
          tracesDiscoverHref
            ? {
                id: 'openTracesInDiscover',
                name: i18n.translate('xpack.apm.serviceFlyout.openTracesInDiscoverAction', {
                  defaultMessage: 'Open traces in Discover',
                }),
                href: tracesDiscoverHref,
                ebt: {
                  action: EBT_CLICK_ACTIONS.OPEN_IN_DISCOVER,
                  element: SERVICE_FLYOUT_EBT_ELEMENTS.ACTIONS_MENU,
                  detail: 'traces',
                },
              }
            : undefined,
          logsDiscoverHref
            ? {
                id: 'openLogsInDiscover',
                name: i18n.translate('xpack.apm.serviceFlyout.openLogsInDiscoverAction', {
                  defaultMessage: 'Open logs in Discover',
                }),
                href: logsDiscoverHref,
                ebt: {
                  action: EBT_CLICK_ACTIONS.OPEN_IN_DISCOVER,
                  element: SERVICE_FLYOUT_EBT_ELEMENTS.ACTIONS_MENU,
                  detail: 'logs',
                },
              }
            : undefined,
        ].filter((action): action is NonNullable<typeof action> => Boolean(action)),
      });
    }

    if (alertsHref) {
      groups.push({
        id: 'alerts',
        groupLabel: i18n.translate('xpack.apm.serviceFlyout.alertsActionsGroupLabel', {
          defaultMessage: 'Alerts',
        }),
        actions: [
          {
            id: 'openAlerts',
            name: i18n.translate('xpack.apm.serviceFlyout.openAlertsAction', {
              defaultMessage: 'Open in Alerts',
            }),
            href: alertsHref,
            ebt: {
              action: EBT_CLICK_ACTIONS.VIEW_ALERTS,
              element: SERVICE_FLYOUT_EBT_ELEMENTS.ACTIONS_MENU,
            },
          },
        ],
      });
    }

    if (slosHref) {
      groups.push({
        id: 'slos',
        groupLabel: i18n.translate('xpack.apm.serviceFlyout.sloActionsGroupLabel', {
          defaultMessage: 'SLOs',
        }),
        actions: [
          {
            id: 'openSlos',
            name: i18n.translate('xpack.apm.serviceFlyout.openSlosAction', {
              defaultMessage: 'Open in SLOs',
            }),
            href: slosHref,
            ebt: {
              action: EBT_CLICK_ACTIONS.VIEW_SLOS,
              element: SERVICE_FLYOUT_EBT_ELEMENTS.ACTIONS_MENU,
            },
          },
        ],
      });
    }

    return groups;
  }, [alertsHref, logsDiscoverHref, slosHref, tracesDiscoverHref]);

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <ActionsContextMenu
            id="service-map-service-flyout-actions-menu"
            dataTestSubjPrefix="serviceFlyoutActionsMenu"
            actions={actionGroups}
            button={
              <EuiButton
                fill
                size="s"
                iconType="chevronSingleDown"
                iconSide="right"
                disabled={actionGroups.length === 0}
                data-test-subj="serviceFlyoutActionsButton"
              >
                {i18n.translate('xpack.apm.serviceFlyout.actionsButtonLabel', {
                  defaultMessage: 'Actions',
                })}
              </EuiButton>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
}
