/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiCheckbox, EuiSelect, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { getDateDifference } from '../../../../common/utils/formatters';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { px, unit } from '../../../style/variables';
import * as urlHelpers from '../../shared/Links/url_helpers';

const PrependContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: ${({ theme }) => theme.eui.euiGradientMiddle};
  padding: 0 ${px(unit)};
`;
function getSelectOptions({
  showYesterdayOption,
  showWeekOption,
}: {
  showYesterdayOption: boolean;
  showWeekOption: boolean;
}) {
  return [
    ...(showYesterdayOption
      ? [
          {
            value: 'yesterday',
            text: i18n.translate('xpack.apm.timeComparison.select.yesterday', {
              defaultMessage: 'Yesterday',
            }),
          },
        ]
      : []),
    ...(showWeekOption
      ? [
          {
            value: 'week',
            text: i18n.translate('xpack.apm.timeComparison.select.weekAgo', {
              defaultMessage: 'A week ago',
            }),
          },
        ]
      : []),
  ];
}

export function TimeComparison() {
  const history = useHistory();
  const {
    urlParams: { start, end, comparisonEnabled, comparisonType },
  } = useUrlParams();
  const dateDiff = getDateDifference(moment(start), moment(end), 'days');

  const selectOptions = getSelectOptions({
    showYesterdayOption: dateDiff < 1,
    showWeekOption: dateDiff <= 7,
  });

  // Sets default values
  if (
    comparisonEnabled === undefined &&
    comparisonType === undefined &&
    selectOptions.length !== 0
  ) {
    urlHelpers.replace(history, {
      query: {
        comparisonEnabled: 'true',
        comparisonType: selectOptions[0].value,
      },
    });
    return null;
  }

  // Disables comparison when selectOptions is empty
  if (comparisonEnabled === true && selectOptions.length === 0) {
    urlHelpers.replace(history, {
      query: { comparisonEnabled: 'false' },
    });
    return null;
  }

  const isSelectedComparisonTypeAvailable = selectOptions.some(
    ({ value }) => value === comparisonType
  );

  // Replaces type when current one is no longer available in the select options
  if (selectOptions.length !== 0 && !isSelectedComparisonTypeAvailable) {
    urlHelpers.replace(history, {
      query: {
        comparisonEnabled: 'true',
        comparisonType: selectOptions[0].value,
      },
    });
    return null;
  }

  return (
    <EuiToolTip
      content={
        selectOptions.length === 0 &&
        i18n.translate('xpack.apm.timeComparison.tooltipLabel', {
          defaultMessage:
            'Week-over-week comparison is not available for ranges longer than 7 days.',
        })
      }
    >
      <EuiSelect
        disabled={selectOptions.length <= 1}
        options={selectOptions}
        value={comparisonType}
        prepend={
          <PrependContainer>
            <EuiCheckbox
              disabled={selectOptions.length === 0}
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
    </EuiToolTip>
  );
}
