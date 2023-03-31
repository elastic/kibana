/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup, EuiButtonGroupOptionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HOST_LIMIT_OPTIONS } from '../../constants';
import { HostLimitOptions } from '../../types';

interface Props {
  limit: HostLimitOptions;
  onChange: (limit: number) => void;
}

export const LimitOptions = ({ limit, onChange }: Props) => {
  return (
    <EuiButtonGroup
      type="single"
      legend={i18n.translate('xpack.infra.hostsViewPage.tabs.alerts.alertStatusFilter.legend', {
        defaultMessage: 'Filter by',
      })}
      idSelected={buildId(limit)}
      options={options}
      onChange={(_, value: number) => onChange(value)}
    />
  );
};

const buildId = (option: number) => `hostLimit_${option}`;
const options: EuiButtonGroupOptionProps[] = HOST_LIMIT_OPTIONS.map((option) => ({
  id: buildId(option),
  label: `${option}`,
  value: option,
  'data-test-subj': `hostsView-limit-filter-show-${option}-button`,
}));
