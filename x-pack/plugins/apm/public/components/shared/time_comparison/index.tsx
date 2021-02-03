/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  const dateFormat = isDifferentYears ? 'DD/MM/YY' : 'DD/MM';
  return `${momentStart.format(dateFormat)} - ${momentEnd.format(dateFormat)}`;
}

function getSelectOptions({ start, end }: { start?: string; end?: string }) {
  const momentStart = moment(start);
  const momentEnd = moment(end);
  const dateDiff = getDateDifference(momentStart, momentEnd, 'days');

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

  const prevPeriodOption = {
    value: 'previousPeriod',
    text: formatPreviousPeriodDates({ momentStart, momentEnd }),
  };

  // Less than one day
  if (dateDiff < 1) {
    return [yesterdayOption, aWeekAgoOption];
  }

  // Less than one week
  if (dateDiff <= 7) {
    return [aWeekAgoOption];
  }

  // above one week
  return [prevPeriodOption];
}

export function TimeComparison() {
  const history = useHistory();
  const { isMedium, isLarge } = useBreakPoints();
  const {
    urlParams: { start, end, comparisonEnabled, comparisonType },
  } = useUrlParams();

  const selectOptions = getSelectOptions({ start, end });

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
      disabled={selectOptions.length <= 1}
      options={selectOptions}
      value={comparisonType}
      prepend={
        <PrependContainer>
          <EuiCheckbox
            id="comparison"
            label={i18n.translate('xpack.apm.timeComparison.label', {
              defaultMessage: 'Comparison',
            })}
            checked={comparisonEnabled && selectOptions.length > 0}
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
