/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCheckbox, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { useUiTracker } from '../../../../../observability/public';
import { TimeRangeComparisonEnum } from '../../../../common/runtime_types/comparison_type_rt';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import { useTimeRange } from '../../../hooks/use_time_range';
import * as urlHelpers from '../../shared/Links/url_helpers';
import { getComparisonEnabled } from './get_comparison_enabled';
import { getComparisonTypes } from './get_comparison_types';
import { getTimeRangeComparison } from './get_time_range_comparison';

const PrependContainer = euiStyled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: ${({ theme }) =>
    theme.eui.euiFormInputGroupLabelBackground};
  padding: 0 ${({ theme }) => theme.eui.paddingSizes.m};
`;

function getDateFormat({
  previousPeriodStart,
  currentPeriodEnd,
}: {
  previousPeriodStart?: string;
  currentPeriodEnd?: string;
}) {
  const momentPreviousPeriodStart = moment(previousPeriodStart);
  const momentCurrentPeriodEnd = moment(currentPeriodEnd);
  const isDifferentYears =
    momentPreviousPeriodStart.get('year') !==
    momentCurrentPeriodEnd.get('year');
  return isDifferentYears ? 'DD/MM/YY HH:mm' : 'DD/MM HH:mm';
}

function formatDate({
  dateFormat,
  previousPeriodStart,
  previousPeriodEnd,
}: {
  dateFormat: string;
  previousPeriodStart?: string;
  previousPeriodEnd?: string;
}) {
  const momentStart = moment(previousPeriodStart);
  const momentEnd = moment(previousPeriodEnd);
  return `${momentStart.format(dateFormat)} - ${momentEnd.format(dateFormat)}`;
}

export function getSelectOptions({
  comparisonTypes,
  start,
  end,
}: {
  comparisonTypes: TimeRangeComparisonEnum[];
  start?: string;
  end?: string;
}) {
  return comparisonTypes.map((value) => {
    switch (value) {
      case TimeRangeComparisonEnum.DayBefore: {
        return {
          value,
          text: i18n.translate('xpack.apm.timeComparison.select.dayBefore', {
            defaultMessage: 'Day before',
          }),
        };
      }
      case TimeRangeComparisonEnum.WeekBefore: {
        return {
          value,
          text: i18n.translate('xpack.apm.timeComparison.select.weekBefore', {
            defaultMessage: 'Week before',
          }),
        };
      }
      case TimeRangeComparisonEnum.PeriodBefore: {
        const { comparisonStart, comparisonEnd } = getTimeRangeComparison({
          comparisonType: TimeRangeComparisonEnum.PeriodBefore,
          start,
          end,
          comparisonEnabled: true,
        });

        const dateFormat = getDateFormat({
          previousPeriodStart: comparisonStart,
          currentPeriodEnd: end,
        });

        return {
          value,
          text: formatDate({
            dateFormat,
            previousPeriodStart: comparisonStart,
            previousPeriodEnd: comparisonEnd,
          }),
        };
      }
    }
  });
}

export function TimeComparison() {
  const { core } = useApmPluginContext();
  const trackApmEvent = useUiTracker({ app: 'apm' });
  const history = useHistory();
  const { isSmall } = useBreakpoints();
  const {
    query: { rangeFrom, rangeTo },
  } = useAnyOfApmParams('/services', '/backends/*', '/services/{serviceName}');

  const { exactStart, exactEnd } = useTimeRange({
    rangeFrom,
    rangeTo,
  });

  const {
    urlParams: { comparisonEnabled, comparisonType },
  } = useLegacyUrlParams();

  const comparisonTypes = getComparisonTypes({
    start: exactStart,
    end: exactEnd,
  });

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
        comparisonType: comparisonType ? comparisonType : comparisonTypes[0],
      },
    });
    return null;
  }

  const selectOptions = getSelectOptions({
    comparisonTypes,
    start: exactStart,
    end: exactEnd,
  });

  const isSelectedComparisonTypeAvailable = selectOptions.some(
    ({ value }) => value === comparisonType
  );

  // Replaces type when current one is no longer available in the select options
  if (selectOptions.length !== 0 && !isSelectedComparisonTypeAvailable) {
    urlHelpers.replace(history, {
      query: { comparisonType: selectOptions[0].value },
    });
    return null;
  }

  return (
    <EuiSelect
      fullWidth={isSmall}
      data-test-subj="comparisonSelect"
      disabled={!comparisonEnabled}
      options={selectOptions}
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
