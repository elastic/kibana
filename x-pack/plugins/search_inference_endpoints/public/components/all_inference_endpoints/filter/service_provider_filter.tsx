/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { SERVICE_PROVIDERS } from '../render_table_columns/render_service_provider/service_provider';
import type { FilterOptions, ServiceProviderKeys } from '../types';
import type { MultiSelectFilterOption } from './multi_select_filter';
import { MultiSelectFilter, mapToMultiSelectOption } from './multi_select_filter';
import * as i18n from './translations';

interface Props {
  optionKeys: ServiceProviderKeys[];
  onChange: (newFilterOptions: Partial<FilterOptions>) => void;
}

const options = mapToMultiSelectOption(
  Object.keys(SERVICE_PROVIDERS),
  Object.fromEntries(Object.entries(SERVICE_PROVIDERS).map(([key, { name }]) => [key, name]))
);

export const ServiceProviderFilter: React.FC<Props> = ({ optionKeys, onChange }) => {
  const onSystemFilterChange = ({
    filterId,
    selectedOptionKeys,
  }: {
    filterId: string;
    selectedOptionKeys: Array<string | null>;
  }) => {
    onChange({
      [filterId]: selectedOptionKeys,
    });
  };
  const renderOption = (option: MultiSelectFilterOption) => {
    return (
      <EuiFlexGroup gutterSize="xs" alignItems={'center'} responsive={false}>
        <EuiFlexItem grow={false}>{option.label}</EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <MultiSelectFilter
      buttonLabel={i18n.SERVICE_PROVIDER}
      id={'provider'}
      onChange={onSystemFilterChange}
      options={options}
      renderOption={renderOption}
      selectedOptionKeys={optionKeys}
    />
  );
};
