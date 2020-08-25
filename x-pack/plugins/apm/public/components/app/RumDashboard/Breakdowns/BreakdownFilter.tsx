/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSuperSelect } from '@elastic/eui';
import {
  CLIENT_GEO_COUNTRY_ISO_CODE,
  USER_AGENT_DEVICE,
  USER_AGENT_NAME,
  USER_AGENT_OS,
} from '../../../../../common/elasticsearch_fieldnames';
import { BreakdownItem } from '../../../../../typings/ui_filters';

interface Props {
  selectedBreakdown: BreakdownItem;
  onBreakdownChange: (value: BreakdownItem) => void;
}

export function BreakdownFilter({
  selectedBreakdown,
  onBreakdownChange,
}: Props) {
  const NO_BREAKDOWN = 'noBreakdown';

  const items: BreakdownItem[] = [
    {
      name: '- No breakdown -',
      fieldName: NO_BREAKDOWN,
      type: 'category',
    },
    {
      name: 'Browser',
      fieldName: USER_AGENT_NAME,
      type: 'category',
    },
    {
      name: 'OS',
      fieldName: USER_AGENT_OS,
      type: 'category',
    },
    {
      name: 'Device',
      fieldName: USER_AGENT_DEVICE,
      type: 'category',
    },
    {
      name: 'Location',
      fieldName: CLIENT_GEO_COUNTRY_ISO_CODE,
      type: 'category',
    },
  ];

  const options = items.map(({ name, fieldName }) => ({
    inputDisplay: fieldName === NO_BREAKDOWN ? name : <strong>{name}</strong>,
    value: fieldName,
    dropdownDisplay: name,
  }));

  const onOptionChange = (value) => {
    if (value === NO_BREAKDOWN) {
      onBreakdownChange(null);
    }
    onBreakdownChange(items.find(({ fieldName }) => fieldName === value));
  };

  return (
    <EuiSuperSelect
      fullWidth
      compressed
      options={options}
      valueOfSelected={selectedBreakdown?.fieldName ?? NO_BREAKDOWN}
      onChange={(value) => onOptionChange(value)}
    />
  );
}
