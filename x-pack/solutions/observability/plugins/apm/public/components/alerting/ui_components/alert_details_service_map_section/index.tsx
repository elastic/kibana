/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonEmpty,
  EuiBadge,
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERT_END, ALERT_START } from '@kbn/rule-data-utils';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
} from '../../../../../common/es_fields/apm';
import { ApmEmbeddableContext } from '../../../../embeddable/embeddable_context';
import { ServiceMapEmbeddable } from '../../../../embeddable/service_map/service_map_embeddable';
import {
  getServiceMapPath,
  getServiceMapUrl,
} from '../../../../embeddable/service_map/get_service_map_url';
import { getServiceMapTimeRange } from './get_service_map_time_range';
import type { EmbeddableDeps } from '../../../../embeddable/types';
import type { AlertDetailsAppSectionProps } from '../alert_details_app_section/types';

const SERVICE_MAP_PANEL_TITLE = i18n.translate('xpack.apm.alertDetails.serviceMapPanel.title', {
  defaultMessage: 'Service map',
});

const VIEW_IN_APM_LABEL = i18n.translate('xpack.apm.alertDetails.serviceMapPanel.viewInApm', {
  defaultMessage: 'View in APM',
});

/** Set to true to show the "limited view" callout with link to full Service map (hidden in initial PoC). */
const SHOW_LIMITED_VIEW_CALLOUT = false;

function LimitedViewCallout({ fullMapUrl }: { fullMapUrl: string }) {
  return (
    <EuiCallOut
      size="s"
      color="primary"
      iconType="info"
      title={
        <>
          {i18n.translate('xpack.apm.alertDetails.serviceMapPanel.limitedViewCalloutPrefix', {
            defaultMessage:
              'This panel shows a limited view of the service map filtered by this alert. Open the ',
          })}
          <EuiLink
            href={fullMapUrl}
            target="_blank"
            external
            data-test-subj="apmAlertDetailsServiceMapFullMapLink"
          >
            {i18n.translate('xpack.apm.alertDetails.serviceMapPanel.fullServiceMapLink', {
              defaultMessage: 'full Service map',
            })}
          </EuiLink>
          {i18n.translate('xpack.apm.alertDetails.serviceMapPanel.limitedViewCalloutSuffix', {
            defaultMessage: ' in APM to see all dependencies and relationships.',
          })}
        </>
      }
    />
  );
}

export interface AlertDetailsServiceMapSectionProps extends AlertDetailsAppSectionProps {
  /** Provided by observability when APM plugin is loaded; required to render the map. */
  embeddableDeps?: EmbeddableDeps | null;
}

// TODO: move this to a shared helper function and make it generic with different fields
function buildKueryFromAlert(alert: AlertDetailsServiceMapSectionProps['alert']): string {
  const serviceName = alert.fields[SERVICE_NAME];
  const transactionName = alert.fields[TRANSACTION_NAME];
  const parts: string[] = [];
  if (serviceName != null && String(serviceName).trim() !== '') {
    const v = String(serviceName).replace(/"/g, '\\"');
    parts.push(`service.name: "${v}"`);
  }
  if (transactionName != null && String(transactionName).trim() !== '') {
    const v = String(transactionName).replace(/"/g, '\\"');
    parts.push(`transaction.name: "${v}"`);
  }
  return parts.join(' and ');
}

export function AlertDetailsServiceMapSection({
  alert,
  embeddableDeps,
}: AlertDetailsServiceMapSectionProps) {
  const kuery = useMemo(() => buildKueryFromAlert(alert), [alert]);
  const environment = alert.fields[SERVICE_ENVIRONMENT];
  const serviceName =
    alert.fields[SERVICE_NAME] != null ? String(alert.fields[SERVICE_NAME]) : undefined;

  if (!embeddableDeps) {
    return null;
  }

  const alertStart = alert.fields[ALERT_START];
  if (!alertStart) {
    return null;
  }

  // Same time range for map and badge requests: 5 min before alert start through alert end (or +10 min if long).
  // Ensures the open alert’s service shows in the map and its alert badge count includes this alert (when active).
  const { from: rangeFrom, to: rangeTo } = getServiceMapTimeRange(
    String(alertStart),
    alert.fields[ALERT_END] != null ? String(alert.fields[ALERT_END]) : undefined
  );
  const env =
    environment != null && String(environment).trim() !== '' ? String(environment) : undefined;
  const serviceMapParams = {
    rangeFrom,
    rangeTo,
    environment: env,
    kuery,
    serviceName,
  };
  const fullMapPath = getServiceMapPath(serviceMapParams);
  const fullMapUrlUnfiltered = getServiceMapUrl(embeddableDeps.coreStart, {
    rangeFrom,
    rangeTo,
  });

  const filters: Array<{ label: string; field: string }> = [];
  if (serviceName) {
    filters.push({ label: `service.name: ${serviceName}`, field: 'service.name' });
  }
  if (env) {
    filters.push({
      label: `service.environment: ${env}`,
      field: 'service.environment',
    });
  }
  const transactionName = alert.fields[TRANSACTION_NAME];
  if (transactionName != null && String(transactionName).trim() !== '') {
    filters.push({
      label: `transaction.name: ${String(transactionName)}`,
      field: 'transaction.name',
    });
  }

  return (
    <ApmEmbeddableContext
      deps={embeddableDeps}
      rangeFrom={rangeFrom}
      rangeTo={rangeTo}
      kuery={kuery}
    >
      <EuiPanel hasBorder paddingSize="m">
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
                  iconType="sortRight"
                  color="text"
                  onClick={() =>
                    embeddableDeps.coreStart.application.navigateToApp('apm', {
                      path: fullMapPath,
                    })
                  }
                  data-test-subj="apmAlertDetailsServiceMapViewInApm"
                >
                  {VIEW_IN_APM_LABEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {filters.length > 0 && (
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="xs" wrap alignItems="center">
                {filters.map((f) => (
                  <EuiBadge key={f.field} color="hollow">
                    {f.label}
                  </EuiBadge>
                ))}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiPanel hasBorder paddingSize="none" style={{ overflow: 'hidden' }}>
              {SHOW_LIMITED_VIEW_CALLOUT && (
                <LimitedViewCallout fullMapUrl={fullMapUrlUnfiltered} />
              )}
              <ServiceMapEmbeddable
                rangeFrom={rangeFrom}
                rangeTo={rangeTo}
                environment={env}
                kuery={kuery}
                serviceName={serviceName}
                core={embeddableDeps.coreStart}
                paddingSize="s"
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </ApmEmbeddableContext>
  );
}

// eslint-disable-next-line import/no-default-export
export default AlertDetailsServiceMapSection;
