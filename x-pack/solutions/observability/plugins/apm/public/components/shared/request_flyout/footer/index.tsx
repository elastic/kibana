/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiFlyoutFooter } from '@elastic/eui';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { ActionsContextMenu, type ActionGroups } from '../../actions_context_menu';
import { useDiscoverHref } from '../../links/discover_links/use_discover_href';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { APM_EBT_ACTIONS } from '../../../app/ebt_constants';
import { SERVICE_MAP_EBT_ELEMENTS } from '../../../app/service_map/ebt_constants';
import { REQUEST_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import { useRequestFlyoutContext } from '../request_flyout_context';

export function RequestFlyoutFooter() {
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
  // PoC concern #4: kuery is fragile for service names with special KQL characters.
  const dependencyOverviewHref = dependencyName
    ? link('/dependencies/overview', {
        query: {
          dependencyName,
          environment,
          rangeFrom,
          rangeTo,
          kuery: `service.name:"${sourceServiceName}"`,
          comparisonEnabled: false,
        },
      })
    : undefined;

  const actionGroups = useMemo(() => {
    const groups: ActionGroups = [];
    const actions = [];

    if (dependencyOverviewHref) {
      actions.push({
        id: 'openInApm',
        name: i18n.translate('xpack.apm.requestFlyout.footer.openInApmLabel', {
          defaultMessage: 'Open in APM',
        }),
        icon: 'apmApp',
        href: dependencyOverviewHref,
        ebt: {
          action: EBT_CLICK_ACTIONS.OPEN_IN_APM,
          element: REQUEST_FLYOUT_EBT_ELEMENTS.ACTIONS_MENU,
        },
      });
    }

    if (discoverHref) {
      actions.push({
        id: 'exploreTraces',
        name: i18n.translate('xpack.apm.requestFlyout.footer.openInDiscoverLabel', {
          defaultMessage: 'Explore traces in Discover',
        }),
        icon: 'productDiscover',
        href: discoverHref,
        ebt: {
          action: APM_EBT_ACTIONS.EXPLORE_TRACES,
          element: SERVICE_MAP_EBT_ELEMENTS.CONNECTION_POPOVER,
        },
      });
    }

    if (actions.length > 0) {
      groups.push({ id: 'main', actions });
    }

    return groups;
  }, [dependencyOverviewHref, discoverHref]);

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <ActionsContextMenu
            id="service-map-request-flyout-actions-menu"
            dataTestSubjPrefix="requestFlyoutActionsMenu"
            actions={actionGroups}
            button={
              <EuiButton
                fill
                size="s"
                iconType="chevronSingleDown"
                iconSide="right"
                disabled={actionGroups.length === 0}
                data-test-subj="requestFlyoutActionsButton"
                {...getEbtProps({
                  action: EBT_CLICK_ACTIONS.OPEN_ACTIONS,
                  element: REQUEST_FLYOUT_EBT_ELEMENTS.ACTIONS_MENU,
                })}
              >
                {i18n.translate('xpack.apm.requestFlyout.footer.actionsButtonLabel', {
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
