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
import { SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../../../common/es_fields/apm';
import { ApmEmbeddableContext } from '../../../../embeddable/embeddable_context';
import { ServiceMapEmbeddable } from '../../../../embeddable/service_map/service_map_embeddable';
import { getServiceMapUrl } from '../../../../embeddable/service_map/get_service_map_url';
import { useApmEmbeddableDeps } from '../../context/apm_embeddable_deps_context';
import type { AlertDetailsAppSectionProps } from '../alert_details_app_section/types';
import { getServiceMapTimeRange } from './get_service_map_time_range';
import { buildKueryFromAlert, buildFiltersFromAlert } from './build_alert_filters';

const SERVICE_MAP_PANEL_TITLE = i18n.translate('xpack.apm.alertDetails.serviceMapPanel.title', {
  defaultMessage: 'Service map preview',
});

const EXPLORE_IN_SERVICE_MAP_LABEL = i18n.translate(
  'xpack.apm.alertDetails.serviceMapPanel.exploreInServiceMap',
  { defaultMessage: 'Explore in Service map' }
);

const EMBEDDABLE_HEIGHT = 400;

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
              // Seed the in-memory router with the alert's environment so SPA
              // navigation from the embedded popover/badges (e.g. the alerts
              // badge) carries it into the destination tab. The badges query
              // itself already gets `environment` via prop.
              environment={environment}
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
