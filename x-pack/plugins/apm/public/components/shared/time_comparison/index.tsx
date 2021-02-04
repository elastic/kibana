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
import styled from 'styled-components';
import { getDateDifference } from '../../../../common/utils/formatters';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { px, unit } from '../../../style/variables';
import * as urlHelpers from '../../shared/Links/url_helpers';
import { useBreakPoints } from '../../../hooks/use_break_points';

const PrependContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: ${({ theme }) => theme.eui.euiGradientMiddle};
  padding: 0 ${px(unit)};
`;

function formatPreviousPeriodDates({
  momentStart,
  momentEnd,
}: {
  momentStart: moment.Moment;
  momentEnd: moment.Moment;
}) {
  const isDifferentYears = momentStart.get('year') !== momentEnd.get('year');
  const dateFormat = isDifferentYears ? 'DD/MM/YY HH:mm' : 'DD/MM HH:mm';
  return `${momentStart.format(dateFormat)} - ${momentEnd.format(dateFormat)}`;
}

function getSelectOptions({
  start,
  end,
  rangeTo,
}: {
  start?: string;
  end?: string;
  rangeTo?: string;
}) {
  const momentStart = moment(start);
  const momentEnd = moment(end);

  const yesterdayOption = {
    value: 'yesterday',
    text: i18n.translate('xpack.apm.timeComparison.select.yesterday', {
      defaultMessage: 'Yesterday',
    }),
  };

  const aWeekAgoOption = {
    value: 'week',
    text: i18n.translate('xpack.apm.timeComparison.select.weekAgo', {
      defaultMessage: 'A week ago',
    }),
  };

  const dateDiff = getDateDifference({
    start: momentStart,
    end: momentEnd,
    unitOfTime: 'days',
    precise: true,
  });
  const isRangeToNow = rangeTo === 'now';

  if (isRangeToNow) {
    // Less than or equals to one day
    if (dateDiff <= 1) {
      return [yesterdayOption, aWeekAgoOption];
    }

    // Less than or equals to one week
    if (dateDiff <= 7) {
      return [aWeekAgoOption];
    }
  }

  const prevPeriodOption = {
    value: 'previousPeriod',
    text: formatPreviousPeriodDates({ momentStart, momentEnd }),
  };

  // above one week or when rangeTo is not "now"
  return [prevPeriodOption];
}

export function TimeComparison() {
  const history = useHistory();
  const { isMedium, isLarge } = useBreakPoints();
  const {
    urlParams: { start, end, comparisonEnabled, comparisonType, rangeTo },
  } = useUrlParams();

  const selectOptions = getSelectOptions({ start, end, rangeTo });

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
              urlHelpers.push(history, {
                query: {
                  comparisonEnabled: Boolean(!comparisonEnabled).toString(),
                },
              });
            }}
          />
        </PrependContainer>
      }
      onChange={(e) => {
        urlHelpers.push(history, {
          query: {
            comparisonType: e.target.value,
          },
        });
      }}
    />
  );
}
