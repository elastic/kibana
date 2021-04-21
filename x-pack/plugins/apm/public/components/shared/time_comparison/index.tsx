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

function getSelectOptions({
  start,
  end,
  rangeTo,
  comparisonEnabled,
}: {
  start?: string;
  end?: string;
  rangeTo?: string;
  comparisonEnabled?: boolean;
}) {
  const momentStart = moment(start);
  const momentEnd = moment(end);

  const dayBeforeOption = {
    value: TimeRangeComparisonType.DayBefore,
    text: i18n.translate('xpack.apm.timeComparison.select.dayBefore', {
      defaultMessage: 'Day before',
    }),
  };

  const weekBeforeOption = {
    value: TimeRangeComparisonType.WeekBefore,
    text: i18n.translate('xpack.apm.timeComparison.select.weekBefore', {
      defaultMessage: 'Week before',
    }),
  };

  const dateDiff = Number(
    getDateDifference({
      start: momentStart,
      end: momentEnd,
      unitOfTime: 'days',
      precise: true,
    }).toFixed(2)
  );

  const isRangeToNow = rangeTo === 'now';

  if (isRangeToNow) {
    // Less than or equals to one day
    if (dateDiff <= 1) {
      return [dayBeforeOption, weekBeforeOption];
    }

    // Less than or equals to one week
    if (dateDiff <= 7) {
      return [weekBeforeOption];
    }
  }

  const { comparisonStart, comparisonEnd } = getTimeRangeComparison({
    comparisonType: TimeRangeComparisonType.PeriodBefore,
    start,
    end,
    comparisonEnabled,
  });

  const dateFormat = getDateFormat({
    previousPeriodStart: comparisonStart,
    currentPeriodEnd: end,
  });

  const prevPeriodOption = {
    value: TimeRangeComparisonType.PeriodBefore,
    text: formatDate({
      dateFormat,
      previousPeriodStart: comparisonStart,
      previousPeriodEnd: comparisonEnd,
    }),
  };

  // above one week or when rangeTo is not "now"
  return [prevPeriodOption];
}

export function TimeComparison() {
  const trackApmEvent = useUiTracker({ app: 'apm' });
  const history = useHistory();
  const { isMedium, isLarge } = useBreakPoints();
  const {
    urlParams: { start, end, comparisonEnabled, comparisonType, rangeTo },
  } = useUrlParams();

  const selectOptions = getSelectOptions({
    start,
    end,
    rangeTo,
    comparisonEnabled,
  });

  // Sets default values
  if (comparisonEnabled === undefined || comparisonType === undefined) {
    urlHelpers.replace(history, {
      query: {
        comparisonEnabled: comparisonEnabled === false ? 'false' : 'true',
        comparisonType: comparisonType
          ? comparisonType
          : selectOptions[0].value,
      },
    });
    return null;
  }

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
