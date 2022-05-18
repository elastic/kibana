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
import { ML_EXPECTED_BOUNDS } from '../../../../common/comparison_rt';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import { useTimeRange } from '../../../hooks/use_time_range';
import * as urlHelpers from '../links/url_helpers';
import { getComparisonOptions } from './get_comparison_options';

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
    query: { rangeFrom, rangeTo, comparisonEnabled, offset },
  } = useAnyOfApmParams('/services', '/backends/*', '/services/{serviceName}');
  const { core } = useApmPluginContext();
  const canGetJobs = !!core.application.capabilities.ml?.canGetJobs;

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const comparisonOptions = useMemo(() => {
    const timeComparisonOptions = getComparisonOptions({ start, end });

    if (canGetJobs) {
      timeComparisonOptions.push({
        value: ML_EXPECTED_BOUNDS,
        text: i18n.translate('xpack.apm.comparison.mlExpectedBounds', {
          defaultMessage: 'Expected bounds',
        }),
      });
    }
    return timeComparisonOptions;
  }, [canGetJobs, start, end]);

  const isSelectedComparisonTypeAvailable = comparisonOptions.some(
    ({ value }) => value === offset
  );

  // Replaces type when current one is no longer available in the select options
  if (comparisonOptions.length !== 0 && !isSelectedComparisonTypeAvailable) {
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
      value={
        comparisonEnabled === ML_EXPECTED_BOUNDS ? ML_EXPECTED_BOUNDS : offset
      }
      prepend={
        <PrependContainer>
          <EuiCheckbox
            id="comparison"
            label={i18n.translate('xpack.apm.timeComparison.label', {
              defaultMessage: 'Comparison',
            })}
            checked={
              comparisonEnabled === true || comparisonEnabled === 'mlBounds'
            }
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
        if (e.target.value === ML_EXPECTED_BOUNDS) {
          urlHelpers.push(history, {
            query: {
              comparisonEnabled: ML_EXPECTED_BOUNDS,
            },
          });
        } else {
          urlHelpers.push(history, {
            query: {
              comparisonEnabled: 'true',
              offset: e.target.value,
            },
          });
        }
      }}
    />
  );
}
