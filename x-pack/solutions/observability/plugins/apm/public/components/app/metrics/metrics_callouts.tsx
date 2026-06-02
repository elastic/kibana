/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { getIngestionPath } from '@kbn/elastic-agent-utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { IngestionTimeRange, IngestionTimeRanges } from '../../../../common/metrics_types';
import { asAbsoluteDateTime } from '../../../../common/utils/formatters';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import type { ApmPluginStartDeps, ApmServices } from '../../../plugin';
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

export type IngestionType = 'classicApm' | 'otelNative';

const formatTimestamp = (ts: number) => asAbsoluteDateTime(ts, 'minutes');

const formatRange = (range: IngestionTimeRange) =>
  `${formatTimestamp(range.from)} - ${formatTimestamp(range.to)}`;

const isModifiedClick = (event: React.MouseEvent<HTMLAnchorElement>) =>
  event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;

const INSTRUMENTATION_NAMES: Record<'classicApm' | 'otelNative', string> = {
  classicApm: i18n.translate('xpack.apm.metrics.instrumentationNames.classicApmLabel', {
    defaultMessage: 'Classic APM',
  }),
  otelNative: i18n.translate('xpack.apm.metrics.instrumentationNames.otelNativeLabel', {
    defaultMessage: 'OpenTelemetry',
  }),
};

const getInstrumentationDetails = (ingestionTimeRanges: IngestionTimeRanges) => {
  const otelIsMoreRecent = ingestionTimeRanges.otelNative.to >= ingestionTimeRanges.classicApm.to;

  const currentKey: IngestionType = otelIsMoreRecent ? 'otelNative' : 'classicApm';
  const previousKey: IngestionType = otelIsMoreRecent ? 'classicApm' : 'otelNative';

  const currentRange = ingestionTimeRanges[currentKey];
  const previousRange = ingestionTimeRanges[previousKey];

  const changeTimestamp = previousRange.to;

  return {
    currentKey,
    previousKey,
    currentName: INSTRUMENTATION_NAMES[currentKey],
    previousName: INSTRUMENTATION_NAMES[previousKey],
    currentRange,
    previousRange,
    changeTimestamp,
  };
};

interface MixedAgentCalloutProps {
  ingestionTimeRanges?: IngestionTimeRanges;
  forcedIngestionType?: IngestionType | null;
  onNavigateToIngestionType?: (type: IngestionType) => void;
}

export function MixedAgentCallout({
  ingestionTimeRanges,
  forcedIngestionType,
  onNavigateToIngestionType,
}: MixedAgentCalloutProps) {
  const { docLinks } = useApmPluginContext().core;
  const {
    services: { telemetry },
  } = useKibana<ApmPluginStartDeps & ApmServices>();
  const history = useHistory();
  const location = useLocation();

  const hasOverlap = useMemo(() => {
    return ingestionTimeRanges
      ? ingestionTimeRanges.classicApm.from < ingestionTimeRanges.otelNative.to &&
          ingestionTimeRanges.otelNative.from < ingestionTimeRanges.classicApm.to
      : false;
  }, [ingestionTimeRanges]);

  const getIngestionRangeLocation = useCallback(
    (range: IngestionTimeRange) => ({
      ...location,
      search: fromQuery({
        ...toQuery(location.search),
        rangeFrom: new Date(range.from).toISOString(),
        rangeTo: new Date(range.to).toISOString(),
      }),
    }),
    [location]
  );

  const navigateToIngestionRange = useCallback(
    (
      event: React.MouseEvent<HTMLAnchorElement>,
      range: IngestionTimeRange,
      type: IngestionType
    ) => {
      try {
        telemetry.reportMetricsCalloutDateRangeSelected({
          calloutType: hasOverlap ? 'overlap' : 'non_overlap',
          selectedInstrumentationType: getIngestionPath(type === 'otelNative'),
        });
        if (event.defaultPrevented || event.button !== 0 || isModifiedClick(event)) {
          return;
        }

        event.preventDefault();
        onNavigateToIngestionType?.(type);
        history.push(getIngestionRangeLocation(range));
      } catch (error) {
        if (!isInactiveHistoryError(error)) {
          throw error;
        }
      }
    },
    [getIngestionRangeLocation, hasOverlap, history, onNavigateToIngestionType, telemetry]
  );

  const baseDetails = useMemo(
    () => (ingestionTimeRanges ? getInstrumentationDetails(ingestionTimeRanges) : null),
    [ingestionTimeRanges]
  );

  const details = useMemo(() => {
    if (!baseDetails || !forcedIngestionType) {
      return baseDetails;
    }
    if (forcedIngestionType === baseDetails.currentKey) {
      return baseDetails;
    }
    return {
      ...baseDetails,
      currentKey: baseDetails.previousKey,
      previousKey: baseDetails.currentKey,
      currentName: baseDetails.previousName,
      previousName: baseDetails.currentName,
      currentRange: baseDetails.previousRange,
      previousRange: baseDetails.currentRange,
    };
  }, [baseDetails, forcedIngestionType]);

  useEffect(() => {
    if (!details) {
      return;
    }

    telemetry.reportMetricsCalloutLoaded({
      calloutType: hasOverlap ? 'overlap' : 'non_overlap',
      shownInstrumentationType: getIngestionPath(details.currentKey === 'otelNative'),
    });
  }, [details, hasOverlap, telemetry]);

  if (!ingestionTimeRanges || !details) {
    return null;
  }

  const title = hasOverlap
    ? i18n.translate('xpack.apm.metrics.mixedAgentTypes.overlapping.title', {
        defaultMessage: 'This service has overlapping data from multiple instrumentation types.',
      })
    : i18n.translate('xpack.apm.metrics.mixedAgentTypes.sequential.title', {
        defaultMessage:
          'The selected time range contains data from multiple instrumentation types.',
      });

  return (
    <EuiCallOut
      announceOnMount
      title={title}
      iconType={hasOverlap ? 'warning' : 'info'}
      color={hasOverlap ? 'warning' : 'primary'}
      data-test-subj={hasOverlap ? 'apmMetricsMixedAgentTypesOverlap' : 'apmMetricsMixedAgentTypes'}
    >
      <p>
        <FormattedMessage
          id="xpack.apm.metrics.mixedAgentTypes.changeDetectedDescription"
          defaultMessage="We have detected a change on {timestamp} in the instrumentation of your service."
          values={{
            timestamp: <strong>{formatTimestamp(details.changeTimestamp)}</strong>,
          }}
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.apm.metrics.mixedAgentTypes.currentInstrumentationDescription"
          defaultMessage="We are showing the {instrumentationName} covering {timePeriod}."
          values={{
            instrumentationName: <strong>{details.currentName}</strong>,
            timePeriod: (
              <EuiLink
                data-test-subj="apmMetricsCurrentTimeRangeLink"
                href={history.createHref(getIngestionRangeLocation(details.currentRange))}
                onClick={(event: React.MouseEvent<HTMLAnchorElement>) =>
                  navigateToIngestionRange(event, details.currentRange, details.currentKey)
                }
              >
                {formatRange(details.currentRange)}
              </EuiLink>
            ),
          }}
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.apm.metrics.mixedAgentTypes.previousRangeDescription"
          defaultMessage="You can see data for the previous {previousInstrumentationName} instrumentation period by changing the date range to {previousDateRange}."
          values={{
            previousInstrumentationName: <strong>{details.previousName}</strong>,
            previousDateRange: (
              <EuiLink
                data-test-subj="apmMetricsPreviousTimeRangeLink"
                href={history.createHref(getIngestionRangeLocation(details.previousRange))}
                onClick={(event: React.MouseEvent<HTMLAnchorElement>) =>
                  navigateToIngestionRange(event, details.previousRange, details.previousKey)
                }
              >
                {formatRange(details.previousRange)}
              </EuiLink>
            ),
          }}
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.apm.metrics.mixedAgentTypes.docsDescription"
          defaultMessage="See {docsLink} for more information."
          values={{
            docsLink: (
              <EuiLink
                data-test-subj="apmMetricsMixedAgentTypesDocLink"
                href={docLinks.links.apm.metricsUi}
                target="_blank"
                external
              >
                {i18n.translate('xpack.apm.metrics.mixedAgentTypes.docsLinkText', {
                  defaultMessage: 'documentation',
                })}
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiCallOut>
  );
}
