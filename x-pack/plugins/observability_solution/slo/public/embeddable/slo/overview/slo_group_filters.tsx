/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { SLOGroupWithSummaryResponse } from '@kbn/slo-schema';
import { i18n } from '@kbn/i18n';

interface Option {
  value: string;
  text: string;
}

export const groupByOptions: Option[] = [
  {
    text: i18n.translate('xpack.slo.sloGroupConfiguration.groupBy.tags', {
      defaultMessage: 'Tags',
    }),
    value: 'slo.tags',
  },
  {
    text: i18n.translate('xpack.slo.sloGroupConfiguration.groupBy.status', {
      defaultMessage: 'Status',
    }),
    value: 'status',
  },
  {
    text: i18n.translate('xpack.slo.sloGroupConfiguration.groupBy.sliType', {
      defaultMessage: 'SLI type',
    }),
    value: 'slo.indicator.type',
  },
];

interface Props {
  onSelected: (prop: string, value: string | SLOGroupWithSummaryResponse[] | undefined) => void;
}

export function SloGroupFilters({ onSelected }: Props) {
  const [selectedGroupBy, setSelectedGroupBy] = useState('status');

  return (
    <>
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.slo.sloGroupConfiguration.groupTypeLabel', {
          defaultMessage: 'Group by',
        })}
      >
        <EuiSelect
          fullWidth
          data-test-subj="o11ySloGroupConfigurationSelect"
          options={groupByOptions}
          value={selectedGroupBy}
          onChange={(e) => {
            setSelectedGroupBy(e.target.value);
            onSelected('groupBy', e.target.value);
          }}
        />
      </EuiFormRow>
    </>
  );
}
