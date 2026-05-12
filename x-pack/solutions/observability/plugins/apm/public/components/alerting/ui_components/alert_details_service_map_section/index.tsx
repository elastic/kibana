/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERT_END, ALERT_START } from '@kbn/rule-data-utils';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../../common/es_fields/apm';
import { ApmEmbeddableContext } from '../../../../embeddable/embeddable_context';
import { ServiceMapEmbeddable } from '../../../../embeddable/service_map/service_map_embeddable';
import { getServiceMapUrl } from '../../../../embeddable/service_map/get_service_map_url';
import { useApmEmbeddableDeps } from '../../context/apm_embeddable_deps_context';
import type { AlertDetailsAppSectionProps } from '../alert_details_app_section/types';
import { getServiceMapTimeRange } from './get_service_map_time_range';

const SERVICE_MAP_PANEL_TITLE = i18n.translate('xpack.apm.alertDetails.serviceMapPanel.title', {
  defaultMessage: 'Service map preview',
});

const EXPLORE_IN_SERVICE_MAP_LABEL = i18n.translate(
  'xpack.apm.alertDetails.serviceMapPanel.exploreInServiceMap',
  { defaultMessage: 'Explore in Service map' }
);

const EMBEDDABLE_HEIGHT = 400;

/**
 * Build a KQL string that scopes the service map to the alerting context.
 * Mirrors the filter badges shown above the map.
 */
function buildKueryFromAlert(alert: AlertDetailsAppSectionProps['alert']): string {
  const serviceName = alert.fields[SERVICE_NAME];
  const transactionType = alert.fields[TRANSACTION_TYPE];
  const transactionName = alert.fields[TRANSACTION_NAME];
  const parts: string[] = [];
  if (serviceName != null && String(serviceName).trim() !== '') {
    const v = String(serviceName).replace(/"/g, '\\"');
    parts.push(`service.name: "${v}"`);
  }
  if (transactionType != null && String(transactionType).trim() !== '') {
    const v = String(transactionType).replace(/"/g, '\\"');
    parts.push(`transaction.type: "${v}"`);
  }
  if (transactionName != null && String(transactionName).trim() !== '') {
    const v = String(transactionName).replace(/"/g, '\\"');
    parts.push(`transaction.name: "${v}"`);
  }
  return parts.join(' and ');
}

function buildFiltersFromAlert(
  alert: AlertDetailsAppSectionProps['alert']
): Array<{ label: string; field: string }> {
  const filters: Array<{ label: string; field: string }> = [];
  const serviceName = alert.fields[SERVICE_NAME];
  const env = alert.fields[SERVICE_ENVIRONMENT];
  const transactionType = alert.fields[TRANSACTION_TYPE];
  const transactionName = alert.fields[TRANSACTION_NAME];

  if (serviceName) {
    filters.push({ label: `service.name: ${String(serviceName)}`, field: 'service.name' });
  }
  if (env != null && String(env).trim() !== '') {
    filters.push({
      label: `service.environment: ${String(env)}`,
      field: 'service.environment',
    });
  }
  if (transactionType != null && String(transactionType).trim() !== '') {
    filters.push({
      label: `transaction.type: ${String(transactionType)}`,
      field: 'transaction.type',
    });
  }
  if (transactionName != null && String(transactionName).trim() !== '') {
    filters.push({
      label: `transaction.name: ${String(transactionName)}`,
      field: 'transaction.name',
    });
  }
  return filters;
}

export function AlertDetailsServiceMapSection({ alert }: AlertDetailsAppSectionProps) {
  const embeddableDeps = useApmEmbeddableDeps();

  const serviceName =
    alert.fields[SERVICE_NAME] != null ? String(alert.fields[SERVICE_NAME]) : undefined;
  const environmentField = alert.fields[SERVICE_ENVIRONMENT];
  const environment =
    environmentField != null && String(environmentField).trim() !== ''
      ? String(environmentField)
      : undefined;

  const alertStart = alert.fields[ALERT_START];
  const alertEnd = alert.fields[ALERT_END];

  const timeRanges = useMemo(() => {
    if (!alertStart) return null;
    return getServiceMapTimeRange(
      String(alertStart),
      alertEnd != null ? String(alertEnd) : undefined
    );
  }, [alertStart, alertEnd]);

  const kuery = useMemo(() => buildKueryFromAlert(alert), [alert]);
  const filters = useMemo(() => buildFiltersFromAlert(alert), [alert]);

  // Hide the panel entirely if we can't build a meaningful preview (e.g. alert is missing
  // a service or a start timestamp, or we don't have the APM embeddable deps in context).
  if (!embeddableDeps || !serviceName || !timeRanges) {
    return null;
  }

  const { from: rangeFrom, to: rangeTo } = timeRanges.graph;
  const { from: badgesRangeFrom, to: badgesRangeTo } = timeRanges.badges;

  const fullMapUrl = getServiceMapUrl(embeddableDeps.coreStart, {
    rangeFrom,
    rangeTo,
    environment,
    kuery,
    serviceName,
  });

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="apmAlertDetailsServiceMapSection">
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h3>{SERVICE_MAP_PANEL_TITLE}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="primary"
                href={fullMapUrl}
                data-test-subj="apmAlertDetailsExploreInServiceMap"
              >
                {EXPLORE_IN_SERVICE_MAP_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {filters.length > 0 && (
          <EuiFlexItem>
            <EuiFlexGroup
              gutterSize="xs"
              wrap
              alignItems="center"
              data-test-subj="apmAlertDetailsServiceMapFilters"
            >
              {filters.map((f) => (
                <EuiFlexItem grow={false} key={f.field}>
                  <EuiBadge color="hollow">{f.label}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}

        <EuiFlexItem>
          <EuiPanel
            hasBorder
            paddingSize="none"
            css={{ overflow: 'hidden', height: EMBEDDABLE_HEIGHT }}
            data-test-subj="apmAlertDetailsServiceMapEmbeddableContainer"
          >
            <ApmEmbeddableContext
              deps={embeddableDeps}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              kuery={kuery}
            >
              <ServiceMapEmbeddable
                rangeFrom={rangeFrom}
                rangeTo={rangeTo}
                badgesRangeFrom={badgesRangeFrom}
                badgesRangeTo={badgesRangeTo}
                environment={environment}
                kuery={kuery}
                // Keep `kuery` scoping the graph data, but let badges aggregate across
                // all visible services so neighbors with active alerts also light up.
                badgesKuery=""
                // Show the popover's "Focus map" button in the alert preview so users
                // can drill into a focused map for any node they click. Embedded
                // contexts hide it by default (kept for dashboards).
                showFocusMapInPopover
                serviceName={serviceName}
                core={embeddableDeps.coreStart}
              />
            </ApmEmbeddableContext>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

// eslint-disable-next-line import/no-default-export
export default AlertDetailsServiceMapSection;
