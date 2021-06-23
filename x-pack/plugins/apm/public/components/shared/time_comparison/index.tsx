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
import { useUiTracker } from '../../../../../observability/public';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { getDateDifference } from '../../../../common/utils/formatters';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { px, unit } from '../../../style/variables';
import * as urlHelpers from '../../shared/Links/url_helpers';
import { useBreakPoints } from '../../../hooks/use_break_points';
import {
  getTimeRangeComparison,
  TimeRangeComparisonType,
} from './get_time_range_comparison';

const PrependContainer = euiStyled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: ${({ theme }) => theme.eui.euiGradientMiddle};
  padding: 0 ${px(unit)};
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

export function getComparisonTypes({
  start,
  end,
}: {
  start?: string;
  end?: string;
}) {
  const momentStart = moment(start);
  const momentEnd = moment(end);

  const dateDiff = getDateDifference({
    start: momentStart,
    end: momentEnd,
    unitOfTime: 'days',
    precise: true,
  });

  // Less than or equals to one day
  if (dateDiff <= 1) {
    return [
      TimeRangeComparisonType.DayBefore,
      TimeRangeComparisonType.WeekBefore,
    ];
  }

  // Less than or equals to one week
  if (dateDiff <= 7) {
    return [TimeRangeComparisonType.WeekBefore];
  }
  // }

  // above one week or when rangeTo is not "now"
  return [TimeRangeComparisonType.PeriodBefore];
}

export function getSelectOptions({
  comparisonTypes,
  start,
  end,
}: {
  comparisonTypes: TimeRangeComparisonType[];
  start?: string;
  end?: string;
}) {
  return comparisonTypes.map((value) => {
    switch (value) {
      case TimeRangeComparisonType.DayBefore: {
        return {
          value,
          text: i18n.translate('xpack.apm.timeComparison.select.dayBefore', {
            defaultMessage: 'Day before',
          }),
        };
      }
      case TimeRangeComparisonType.WeekBefore: {
        return {
          value,
          text: i18n.translate('xpack.apm.timeComparison.select.weekBefore', {
            defaultMessage: 'Week before',
          }),
        };
      }
      case TimeRangeComparisonType.PeriodBefore: {
        const { comparisonStart, comparisonEnd } = getTimeRangeComparison({
          comparisonType: TimeRangeComparisonType.PeriodBefore,
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
  const trackApmEvent = useUiTracker({ app: 'apm' });
  const history = useHistory();
  const { isMedium, isLarge } = useBreakPoints();
  const {
    urlParams: { comparisonEnabled, comparisonType, exactStart, exactEnd },
  } = useUrlParams();

  const comparisonTypes = getComparisonTypes({
    start: exactStart,
    end: exactEnd,
  });

  // Sets default values
  if (comparisonEnabled === undefined || comparisonType === undefined) {
    urlHelpers.replace(history, {
      query: {
        comparisonEnabled: comparisonEnabled === false ? 'false' : 'true',
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
      fullWidth={!isMedium && isLarge}
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
