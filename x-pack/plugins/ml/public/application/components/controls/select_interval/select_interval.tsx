/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { usePageUrlState } from '../../../util/url_state';

interface TableInterval {
  display: string;
  val: string;
}

const OPTIONS = [
  {
    value: 'auto',
    text: i18n.translate('xpack.ml.controls.selectInterval.autoLabel', { defaultMessage: 'Auto' }),
  },
  {
    value: 'hour',
    text: i18n.translate('xpack.ml.controls.selectInterval.hourLabel', {
      defaultMessage: '1 hour',
    }),
  },
  {
    value: 'day',
    text: i18n.translate('xpack.ml.controls.selectInterval.dayLabel', { defaultMessage: '1 day' }),
  },
  {
    value: 'second',
    text: i18n.translate('xpack.ml.controls.selectInterval.showAllLabel', {
      defaultMessage: 'Show all',
    }),
  },
];

function optionValueToInterval(value: string) {
  // Builds the corresponding interval object with the required display and val properties
  // from the specified value.
  const option = OPTIONS.find((opt) => opt.value === value);

  // Default to auto if supplied value doesn't map to one of the options.
  let interval: TableInterval = { display: OPTIONS[0].text, val: OPTIONS[0].value };
  if (option !== undefined) {
    interval = { display: option.text, val: option.value };
  }

  return interval;
}

export const TABLE_INTERVAL_DEFAULT = optionValueToInterval('auto');

export const useTableInterval = (): [TableInterval, (v: TableInterval) => void] => {
  return usePageUrlState<TableInterval>('mlSelectInterval', TABLE_INTERVAL_DEFAULT);
};

/*
 * React component for rendering a select element with various aggregation interval levels.
 */
export const SelectInterval: FC = () => {
  const [interval, setInterval] = useTableInterval();

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setInterval(optionValueToInterval(e.target.value));
  };

  return (
    <EuiSelect
      options={OPTIONS}
      className="ml-select-interval"
      value={interval.val}
      onChange={onChange}
    />
  );
};
