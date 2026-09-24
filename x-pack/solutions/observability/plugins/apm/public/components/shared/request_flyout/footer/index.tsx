/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiFlyoutFooter } from '@elastic/eui';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { APM_EBT_ACTIONS } from '../../../app/ebt_constants';
import { OpenInDiscover } from '../../links/discover_links/open_in_discover';
import { SERVICE_MAP_EBT_ELEMENTS } from '../../../app/service_map/ebt_constants';
import { REQUEST_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import { useRequestFlyoutContext } from '../request_flyout_context';

/**
 * Flyout footer with two actions:
 * 1. Open in Discover — traces filtered by source service + dependency.
 *    Reuses OpenInDiscover exactly as edge_contents.tsx does today.
 * 2. Open in APM — links to the dependency overview with a source-service kuery.
 *    PoC concern #4: service names containing quotes / colons can break the kuery.
 */
export function RequestFlyoutFooter() {
  const {
    connection: { sourceServiceName, dependencyName },
    filters: { environment, rangeFrom, rangeTo },
  } = useRequestFlyoutContext();

  const { link } = useApmRouter();

  // "Open in APM" is only meaningful when there's a single dependency name.
  const dependencyOverviewHref = dependencyName
    ? link('/dependencies/overview', {
        query: {
          dependencyName,
          environment,
          rangeFrom,
          rangeTo,
          // Filter to the source service via kuery.
          // PoC concern #4: this is fragile for service names with special KQL characters.
          kuery: `service.name:"${sourceServiceName}"`,
          comparisonEnabled: false,
        },
      })
    : undefined;

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          {dependencyOverviewHref ? (
            <EuiButtonEmpty
              href={dependencyOverviewHref}
              iconType="apmApp"
              size="s"
              data-test-subj="requestFlyoutOpenInApmButton"
              {...getEbtProps({
                action: EBT_CLICK_ACTIONS.OPEN_IN_APM,
                element: REQUEST_FLYOUT_EBT_ELEMENTS.ACTIONS_MENU,
              })}
            >
              {i18n.translate('xpack.apm.requestFlyout.footer.openInApmLabel', {
                defaultMessage: 'Open in APM',
              })}
            </EuiButtonEmpty>
          ) : null}
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          {sourceServiceName && dependencyName ? (
            <OpenInDiscover
              dataTestSubj="requestFlyoutOpenInDiscoverButton"
              variant="button"
              indexType="traces"
              label={i18n.translate('xpack.apm.requestFlyout.footer.openInDiscoverLabel', {
                defaultMessage: 'Explore traces',
              })}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              queryParams={{
                serviceName: sourceServiceName,
                environment,
                dependencyName,
                sortDirection: 'DESC',
              }}
              ebt={{
                action: APM_EBT_ACTIONS.EXPLORE_TRACES,
                element: SERVICE_MAP_EBT_ELEMENTS.CONNECTION_POPOVER,
              }}
            />
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
}
