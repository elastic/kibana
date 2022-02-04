/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  CLIENT_GEO_COUNTRY_ISO_CODE,
  USER_AGENT_DEVICE,
  USER_AGENT_NAME,
  USER_AGENT_OS,
} from '../../../../../common/elasticsearch_fieldnames';
import { BreakdownItem } from '../../../../../typings/ui_filters';

interface Props {
  selectedBreakdown: BreakdownItem | null;
  onBreakdownChange: (value: BreakdownItem | null) => void;
  dataTestSubj: string;
}

export function BreakdownFilter({
  selectedBreakdown,
  onBreakdownChange,
  dataTestSubj,
}: Props) {
  const NO_BREAKDOWN = 'noBreakdown';

  const items: BreakdownItem[] = [
    {
      name: i18n.translate('xpack.ux.breakDownFilter.noBreakdown', {
        defaultMessage: 'No breakdown',
      }),
      fieldName: NO_BREAKDOWN,
      type: 'category',
    },
    {
      name: i18n.translate('xpack.ux.breakdownFilter.browser', {
        defaultMessage: 'Browser',
      }),
      fieldName: USER_AGENT_NAME,
      type: 'category',
    },
    {
      name: i18n.translate('xpack.ux.breakdownFilter.os', {
        defaultMessage: 'OS',
      }),
      fieldName: USER_AGENT_OS,
      type: 'category',
    },
    {
      name: i18n.translate('xpack.ux.breakdownFilter.device', {
        defaultMessage: 'Device',
      }),
      fieldName: USER_AGENT_DEVICE,
      type: 'category',
    },
    {
      name: i18n.translate('xpack.ux.breakdownFilter.location', {
        defaultMessage: 'Location',
      }),
      fieldName: CLIENT_GEO_COUNTRY_ISO_CODE,
      type: 'category',
    },
  ];

  const options = items.map(({ name, fieldName }) => ({
    inputDisplay: fieldName === NO_BREAKDOWN ? name : <strong>{name}</strong>,
    value: fieldName,
    dropdownDisplay: name,
  }));

  const onOptionChange = (value: string) => {
    if (value === NO_BREAKDOWN) {
      onBreakdownChange(null);
    } else {
      onBreakdownChange(items.find(({ fieldName }) => fieldName === value)!);
    }
  };

  return (
    <EuiSuperSelect
      fullWidth
      compressed
      options={options}
      valueOfSelected={selectedBreakdown?.fieldName ?? NO_BREAKDOWN}
      onChange={(value) => onOptionChange(value)}
      data-test-subj={dataTestSubj}
    />
  );
}
