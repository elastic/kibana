/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCheckbox, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { useUiTracker } from '../../../../../observability/public';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import { useTimeRange } from '../../../hooks/use_time_range';
import * as urlHelpers from '../../shared/links/url_helpers';
import { getComparisonEnabled } from './get_comparison_enabled';
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
  const { core } = useApmPluginContext();
  const trackApmEvent = useUiTracker({ app: 'apm' });
  const history = useHistory();
  const { isSmall } = useBreakpoints();
  const {
    query: { rangeFrom, rangeTo },
  } = useAnyOfApmParams('/services', '/backends/*', '/services/{serviceName}');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const {
    urlParams: { comparisonEnabled, comparisonType },
  } = useLegacyUrlParams();

  const comparisonOptions = getComparisonOptions({ start, end });

  // Sets default values
  if (comparisonEnabled === undefined || comparisonType === undefined) {
    urlHelpers.replace(history, {
      query: {
        comparisonEnabled:
          getComparisonEnabled({
            core,
            urlComparisonEnabled: comparisonEnabled,
          }) === false
            ? 'false'
            : 'true',
        comparisonType: comparisonType
          ? comparisonType
          : comparisonOptions[0].value,
      },
    });
    return null;
  }

  const isSelectedComparisonTypeAvailable = comparisonOptions.some(
    ({ value }) => value === comparisonType
  );

  // Replaces type when current one is no longer available in the select options
  if (comparisonOptions.length !== 0 && !isSelectedComparisonTypeAvailable) {
    urlHelpers.replace(history, {
      query: { comparisonType: comparisonOptions[0].value },
    });
    return null;
  }

  return (
    <EuiSelect
      fullWidth={isSmall}
      data-test-subj="comparisonSelect"
      disabled={!comparisonEnabled}
      options={comparisonOptions}
      value={comparisonType}
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
            comparisonType: e.target.value,
          },
        });
      }}
    />
  );
}
