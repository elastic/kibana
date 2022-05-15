/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCheckbox, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { useUiTracker } from '@kbn/observability-plugin/public';
import { useAnomalyDetectionJobsContext } from '../../../context/anomaly_detection_jobs/use_anomaly_detection_jobs_context';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import { useTimeRange } from '../../../hooks/use_time_range';
import * as urlHelpers from '../links/url_helpers';
import {
  ComparisonOptionEnum,
  getComparisonOptions,
} from './get_comparison_options';

const PrependContainer = euiStyled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: ${({ theme }) =>
    theme.eui.euiFormInputGroupLabelBackground};
  padding: 0 ${({ theme }) => theme.eui.paddingSizes.m};
`;

export function TimeComparison() {
  const trackApmEvent = useUiTracker({ app: 'apm' });
  const history = useHistory();
  const { isSmall } = useBreakpoints();
  const {
    query: { rangeFrom, rangeTo, offset, comparison, environment },
  } = useAnyOfApmParams('/services', '/backends/*', '/services/{serviceName}');

  const { anomalyDetectionJobsStatus, anomalyDetectionJobsData } =
    useAnomalyDetectionJobsContext();
  const showExpectedBoundsOption =
    anomalyDetectionJobsStatus === 'success' &&
    Array.isArray(anomalyDetectionJobsData?.jobs) &&
    anomalyDetectionJobsData?.jobs.some((j) => j.environment === environment);

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const comparisonOptions = useMemo(
    () => getComparisonOptions({ start, end, showExpectedBoundsOption }),
    [start, end, showExpectedBoundsOption]
  );

  const isSelectedComparisonTypeAvailable = comparisonOptions.some(
    ({ value }) => value === offset || value === ComparisonOptionEnum.MlBounds
  );

  // Replaces type when current one is no longer available in the select options
  if (comparisonOptions.length !== 0 && !isSelectedComparisonTypeAvailable) {
    urlHelpers.replace(history, {
      query: {
        offset: comparisonOptions[0].value,
        comparison: ComparisonOptionEnum.Time,
      },
    });
    return null;
  }

  const comparisonEnabled = comparison !== ComparisonOptionEnum.False;
  return (
    <EuiSelect
      fullWidth={isSmall}
      data-test-subj="comparisonSelect"
      disabled={!comparisonEnabled}
      options={comparisonOptions}
      value={comparison === ComparisonOptionEnum.Time ? offset : comparison}
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
                urlHelpers.push(history, {
                  query: {
                    comparison: ComparisonOptionEnum.False,
                  },
                });
              } else {
                // By default, if comparison is turned on
                // We show time comparisons instead of ML expected model bounds
                urlHelpers.push(history, {
                  query: {
                    comparison: ComparisonOptionEnum.Time,
                  },
                });
              }
            }}
          />
        </PrependContainer>
      }
      onChange={(e) => {
        trackApmEvent({
          metric: `time_comparison_type_change_${e.target.value}`,
        });
        if (e.target.value === ComparisonOptionEnum.MlBounds) {
          urlHelpers.push(history, {
            query: {
              comparison: ComparisonOptionEnum.MlBounds,
            },
          });
        } else {
          urlHelpers.push(history, {
            query: {
              offset: e.target.value,
              comparison: ComparisonOptionEnum.Time,
            },
          });
        }
      }}
    />
  );
}
