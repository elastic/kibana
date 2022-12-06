/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCheckbox, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { useUiTracker } from '@kbn/observability-plugin/public';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useEnvironmentsContext } from '../../../context/environments_context/use_environments_context';
import { useAnomalyDetectionJobsContext } from '../../../context/anomaly_detection_jobs/use_anomaly_detection_jobs_context';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import { useTimeRange } from '../../../hooks/use_time_range';
import * as urlHelpers from '../links/url_helpers';
import {
  getComparisonOptions,
  TimeRangeComparisonEnum,
} from './get_comparison_options';

const PrependContainer = euiStyled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: ${({ theme }) =>
    theme.eui.euiFormInputGroupLabelBackground};
  padding: 0 ${({ theme }) => theme.eui.euiSizeM};
`;

export function TimeComparison() {
  const trackApmEvent = useUiTracker({ app: 'apm' });
  const history = useHistory();
  const { isSmall } = useBreakpoints();
  const {
    query: { rangeFrom, rangeTo, comparisonEnabled, offset },
  } = useAnyOfApmParams(
    '/services',
    '/dependencies/*',
    '/services/{serviceName}'
  );

  const location = useLocation();
  const apmRouter = useApmRouter();

  const { anomalyDetectionJobsStatus, anomalyDetectionJobsData } =
    useAnomalyDetectionJobsContext();
  const { core } = useApmPluginContext();
  const { preferredEnvironment } = useEnvironmentsContext();

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const canGetJobs = !!core.application.capabilities.ml?.canGetJobs;

  const comparisonOptions = useMemo(() => {
    const matchingRoutes = apmRouter.getRoutesToMatch(location.pathname);
    // Only show the "Expected bounds" option in Overview and Transactions tabs
    const showExpectedBoundsForThisTab = matchingRoutes.some(
      (d) =>
        d.path === '/services/{serviceName}/overview' ||
        d.path === '/services/{serviceName}/transactions'
    );

    const timeComparisonOptions = getComparisonOptions({
      start,
      end,
      showSelectedBoundsOption: showExpectedBoundsForThisTab && canGetJobs,
      anomalyDetectionJobsStatus,
      anomalyDetectionJobsData,
      preferredEnvironment,
    });

    return timeComparisonOptions;
  }, [
    canGetJobs,
    anomalyDetectionJobsStatus,
    anomalyDetectionJobsData,
    start,
    end,
    preferredEnvironment,
    apmRouter,
    location.pathname,
  ]);

  const isSelectedComparisonTypeAvailable = comparisonOptions.some(
    ({ value }) => value === offset
  );

  // Replaces type when current one is no longer available in the select options
  if (
    (comparisonOptions.length !== 0 && !isSelectedComparisonTypeAvailable) ||
    // If user changes environment and there's no ML jobs that match the new environment
    // then also default to first comparison option as well
    (offset === TimeRangeComparisonEnum.ExpectedBounds &&
      comparisonOptions.find(
        (d) => d.value === TimeRangeComparisonEnum.ExpectedBounds
      )?.disabled === true)
  ) {
    urlHelpers.replace(history, {
      query: { offset: comparisonOptions[0].value },
    });
    return null;
  }

  return (
    <EuiSelect
      fullWidth={isSmall}
      data-test-subj="comparisonSelect"
      disabled={comparisonEnabled === false}
      options={comparisonOptions}
      value={offset}
      prepend={
        <PrependContainer>
          <EuiCheckbox
            id="comparison"
            label={i18n.translate('xpack.apm.timeComparison.label', {
              defaultMessage: 'Comparison',
            })}
            checked={comparisonEnabled}
            onChange={() => {
              const nextComparisonEnabledValue = !comparisonEnabled;
              if (nextComparisonEnabledValue === false) {
                trackApmEvent({
                  metric: 'time_comparison_disabled',
                });
              }
              urlHelpers.push(history, {
                query: {
                  comparisonEnabled: Boolean(
                    nextComparisonEnabledValue
                  ).toString(),
                },
              });
            }}
          />
        </PrependContainer>
      }
      onChange={(e) => {
        trackApmEvent({
          metric: `time_comparison_type_change_${e.target.value}`,
        });
        urlHelpers.push(history, {
          query: {
            offset: e.target.value,
          },
        });
      }}
    />
  );
}
