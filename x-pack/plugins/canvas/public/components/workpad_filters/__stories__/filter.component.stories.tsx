/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiTextColor } from '@elastic/eui';
import { storiesOf } from '@storybook/react';
import React, { FC } from 'react';
import { FormattedFilterViewInstance } from '../../../../types';
import { Filter } from '../filter.component';

const filter: FormattedFilterViewInstance = {
  type: {
    label: 'Type',
    formattedValue: 'exactly',
  },
  column: {
    label: 'Column',
    formattedValue: 'project',
  },
  value: {
    label: 'Value',
    formattedValue: 'kibana',
  },
  filterGroup: {
    label: 'Filter group',
    formattedValue: 'Group 1',
  },
};

const component: FC<any> = ({ value }) => (
  <EuiText>
    <EuiTextColor color="success">
      <h3>{value}</h3>
    </EuiTextColor>
  </EuiText>
);

storiesOf('components/WorkpadFilters/FilterComponent', module)
  .add('default', () => <Filter filter={filter} />)
  .add('with component field', () => (
    <Filter filter={{ ...filter, value: { ...filter.value, component } }} />
  ))
  .add('with custom filter fields', () => (
    <Filter
      filter={{
        ...filter,
        customField: { label: 'Custom Field', formattedValue: 'Some unknown field' },
      }}
    />
  ));
