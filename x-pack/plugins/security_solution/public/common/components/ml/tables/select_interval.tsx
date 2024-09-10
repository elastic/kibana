/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import type { EuiSelectProps } from '@elastic/eui';
import { EuiSelect, EuiIcon, EuiToolTip } from '@elastic/eui';
import * as i18n from './translations';

const OPTIONS = [
  {
    value: 'auto',
    text: i18n.INTERVAL_AUTO,
  },
  {
    value: 'hour',
    text: i18n.INTERVAL_HOUR,
  },
  {
    value: 'day',
    text: i18n.INTERVAL_DAY,
  },
  {
    value: 'second',
    text: i18n.INTERVAL_SHOW_ALL,
  },
];

export const SelectInterval: React.FC<{
  interval: string;
  onChange: (interval: string) => void;
}> = ({ interval, onChange }) => {
  const onChangeCb = useCallback<NonNullable<EuiSelectProps['onChange']>>(
    (e) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <EuiSelect
      data-test-subj="selectInterval"
      prepend={i18n.INTERVAL}
      append={
        <EuiToolTip content={i18n.INTERVAL_TOOLTIP}>
          <EuiIcon type="questionInCircle" color="subdued" />
        </EuiToolTip>
      }
      options={OPTIONS}
      value={interval}
      onChange={onChangeCb}
    />
  );
};
