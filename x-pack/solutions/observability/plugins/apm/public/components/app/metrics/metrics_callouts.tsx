/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import moment from 'moment';
import { useHistory, useLocation } from 'react-router-dom';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IngestionTimeRange } from '../../../context/apm_service/apm_service_context';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { fromQuery, toQuery, isInactiveHistoryError } from '../../shared/links/url_helpers';

export function NoDataForRangeCallout() {
  return (
    <EuiCallOut
      announceOnMount
      title={i18n.translate('xpack.apm.metrics.noDataForRange.title', {
        defaultMessage:
          'No metrics data found for the selected time range. Try adjusting the time range.',
      })}
      iconType="eyeSlash"
      color="warning"
      data-test-subj="apmMetricsNoDataForRange"
    />
  );
}

export function NoDashboardFoundCallout() {
  return (
    <EuiCallOut
      announceOnMount
      title={i18n.translate('xpack.apm.metrics.emptyState.title', {
        defaultMessage: 'Runtime metrics are not available for this Agent / SDK type.',
      })}
      iconType="info"
      data-test-subj="apmMetricsNoDashboardFound"
    />
  );
}

// TODO: remove flip once a dedicated mixed-agent-types doc page is available
const SHOW_MIXED_AGENT_DOC_LINK = false;

const DATE_FORMAT = 'MMM D, YYYY HH:mm';

const formatRange = (range: IngestionTimeRange) =>
  `${moment(range.from).format(DATE_FORMAT)} - ${moment(range.to).format(DATE_FORMAT)}`;

interface MixedAgentCalloutProps {
  hasMultipleAgentTypes?: boolean;
  ingestionTimeRanges?: {
    classicApm: IngestionTimeRange;
    otelNative: IngestionTimeRange;
  };
}

export function MixedAgentCallout({
  hasMultipleAgentTypes,
  ingestionTimeRanges,
}: MixedAgentCalloutProps) {
  const { docLinks } = useApmPluginContext().core;
  const history = useHistory();
  const location = useLocation();

  const navigateToTimeRange = useCallback(
    (range: IngestionTimeRange) => {
      try {
        history.push({
          ...location,
          search: fromQuery({
            ...toQuery(location.search),
            rangeFrom: new Date(range.from).toISOString(),
            rangeTo: new Date(range.to).toISOString(),
          }),
        });
      } catch (error) {
        if (!isInactiveHistoryError(error)) {
          throw error;
        }
      }
    },
    [history, location]
  );

  if (!hasMultipleAgentTypes || !ingestionTimeRanges) {
    return null;
  }

  const hasOverlap =
    ingestionTimeRanges.classicApm.from < ingestionTimeRanges.otelNative.to &&
    ingestionTimeRanges.otelNative.from < ingestionTimeRanges.classicApm.to;

  const renderRangeLink = (range: IngestionTimeRange) => (
    <EuiLink data-test-subj="apmMetricsTimeRangeLink" onClick={() => navigateToTimeRange(range)}>
      {formatRange(range)}
    </EuiLink>
  );

  const rangeDetails = (
    <p>
      {i18n.translate('xpack.apm.metrics.mixedAgentTypes.classicRangeLabel', {
        defaultMessage: 'Classic APM metrics:',
      })}{' '}
      {renderRangeLink(ingestionTimeRanges.classicApm)}
      <br />
      {i18n.translate('xpack.apm.metrics.mixedAgentTypes.otelRangeLabel', {
        defaultMessage: 'OpenTelemetry metrics:',
      })}{' '}
      {renderRangeLink(ingestionTimeRanges.otelNative)}
    </p>
  );

  if (hasOverlap) {
    return (
      <>
        <EuiCallOut
          announceOnMount
          title={i18n.translate('xpack.apm.metrics.mixedAgentTypes.overlapping.title', {
            defaultMessage:
              'This service has overlapping data from multiple instrumentation types. Only metrics from the most recent instrumentation are shown.',
          })}
          iconType="warning"
          color="warning"
          data-test-subj="apmMetricsMixedAgentTypesOverlap"
        >
          {rangeDetails}
          <p>
            {i18n.translate('xpack.apm.metrics.mixedAgentTypes.overlapping.description', {
              defaultMessage:
                'Both instrumentation types are sending data simultaneously. Metrics from the other type are not displayed in this view.',
            })}
          </p>
          {SHOW_MIXED_AGENT_DOC_LINK && (
            <p>
              <EuiLink
                data-test-subj="apmMetricsMixedAgentTypesDocLink"
                href={docLinks.links.apm.overview}
                target="_blank"
                external
              >
                {i18n.translate('xpack.apm.metrics.mixedAgentTypes.docsLink', {
                  defaultMessage: 'See documentation for more information',
                })}
              </EuiLink>
            </p>
          )}
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    );
  }

  return (
    <>
      <EuiCallOut
        announceOnMount
        title={i18n.translate('xpack.apm.metrics.mixedAgentTypes.sequential.title', {
          defaultMessage:
            'The selected time range contains data from multiple instrumentation types. Only metrics from the most recent instrumentation are shown.',
        })}
        iconType="info"
        color="primary"
        data-test-subj="apmMetricsMixedAgentTypes"
      >
        {rangeDetails}
        <p>
          {i18n.translate('xpack.apm.metrics.mixedAgentTypes.sequential.description', {
            defaultMessage:
              'Adjust the time range to view metrics from a specific instrumentation type.',
          })}
        </p>
        {SHOW_MIXED_AGENT_DOC_LINK && (
          <p>
            <EuiLink
              data-test-subj="apmMetricsMixedAgentTypesDocLink"
              href={docLinks.links.apm.overview}
              target="_blank"
              external
            >
              {i18n.translate('xpack.apm.metrics.mixedAgentTypes.docsLink', {
                defaultMessage: 'See documentation for more information',
              })}
            </EuiLink>
          </p>
        )}
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
}
