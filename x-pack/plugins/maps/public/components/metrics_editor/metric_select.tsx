/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, EuiComboBoxOptionOption, EuiComboBoxProps } from '@elastic/eui';
import { AGG_TYPE } from '../../../common/constants';

const AGG_OPTIONS = [
  {
    label: i18n.translate('xpack.maps.metricSelect.averageDropDownOptionLabel', {
      defaultMessage: 'Average',
    }),
    value: AGG_TYPE.AVG,
  },
  {
    label: i18n.translate('xpack.maps.metricSelect.countDropDownOptionLabel', {
      defaultMessage: 'Count',
    }),
    value: AGG_TYPE.COUNT,
  },
  {
    label: i18n.translate('xpack.maps.metricSelect.maxDropDownOptionLabel', {
      defaultMessage: 'Max',
    }),
    value: AGG_TYPE.MAX,
  },
  {
    label: i18n.translate('xpack.maps.metricSelect.minDropDownOptionLabel', {
      defaultMessage: 'Min',
    }),
    value: AGG_TYPE.MIN,
  },
  {
    label: i18n.translate('xpack.maps.metricSelect.sumDropDownOptionLabel', {
      defaultMessage: 'Sum',
    }),
    value: AGG_TYPE.SUM,
  },
  {
    label: i18n.translate('xpack.maps.metricSelect.termsDropDownOptionLabel', {
      defaultMessage: 'Top term',
    }),
    value: AGG_TYPE.TERMS,
  },
  {
    label: i18n.translate('xpack.maps.metricSelect.cardinalityDropDownOptionLabel', {
      defaultMessage: 'Unique count',
    }),
    value: AGG_TYPE.UNIQUE_COUNT,
  },
];

type Props = Omit<EuiComboBoxProps<AGG_TYPE>, 'onChange'> & {
  value: AGG_TYPE;
  onChange: (aggType: AGG_TYPE) => void;
  metricsFilter?: (metricOption: EuiComboBoxOptionOption<AGG_TYPE>) => boolean;
};

export function MetricSelect({ value, onChange, metricsFilter, ...rest }: Props) {
  function onAggChange(selectedOptions: Array<EuiComboBoxOptionOption<AGG_TYPE>>) {
    if (selectedOptions.length === 0) {
      return;
    }

    const aggType = selectedOptions[0].value!;
    onChange(aggType);
  }

  const options = metricsFilter ? AGG_OPTIONS.filter(metricsFilter) : AGG_OPTIONS;

  return (
    <EuiComboBox
      placeholder={i18n.translate('xpack.maps.metricSelect.selectAggregationPlaceholder', {
        defaultMessage: 'Select aggregation',
      })}
      singleSelection={true}
      isClearable={false}
      options={options}
      selectedOptions={AGG_OPTIONS.filter((option) => {
        return value === option.value;
      })}
      onChange={onAggChange}
      {...rest}
    />
  );
}
