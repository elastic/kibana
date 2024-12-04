/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption, EuiSelectableProps } from '@elastic/eui';
import { EuiSelectable, EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { ServiceProviderKeys } from '../../../../../common/inference/constants';
import {
  ProviderSolution,
  SERVICE_PROVIDERS,
  ServiceProviderIcon,
  ServiceProviderName,
} from '../render_service_provider/service_provider';

/**
 * Modifies options by creating new property `providerTitle`(with value of `title`), and by setting `title` to undefined.
 * Thus prevents appearing default browser tooltip on option hover (attribute `title` that gets rendered on li element)
 *
 * @param {EuiSelectableOption[]} options
 * @returns {EuiSelectableOption[]} modified options
 */

export interface SelectableProviderProps {
  isLoading: boolean;
  getSelectableOptions: (searchProviderValue?: string) => EuiSelectableOption[];
  onClosePopover: () => void;
  onProviderChange: (provider?: string) => void;
}

const SelectableProviderComponent: React.FC<SelectableProviderProps> = ({
  isLoading,
  getSelectableOptions,
  onClosePopover,
  onProviderChange,
}) => {
  const [searchProviderValue, setSearchProviderValue] = useState<string>('');
  const onSearchProvider = useCallback(
    (val: string) => {
      setSearchProviderValue(val);
    },
    [setSearchProviderValue]
  );

  const renderProviderOption = useCallback<NonNullable<EuiSelectableProps['renderOption']>>(
    (option, searchValue) => {
      const provider = Object.keys(SERVICE_PROVIDERS).includes(option.label)
        ? SERVICE_PROVIDERS[option.label as ServiceProviderKeys]
        : undefined;

      const supportedBySolutions = (provider &&
        provider.solutions.map((solution) => (
          <EuiFlexItem>
            <EuiBadge color="hollow">{solution}</EuiBadge>
          </EuiFlexItem>
        ))) ?? (
        <EuiFlexItem>
          <EuiBadge color="hollow">{'Search' as ProviderSolution}</EuiBadge>
        </EuiFlexItem>
      );
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <ServiceProviderIcon providerKey={option.label as ServiceProviderKeys} />
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <EuiFlexGroup gutterSize="none" direction="column" responsive={false}>
              <EuiFlexItem data-test-subj="provider">
                <ServiceProviderName
                  providerKey={option.label as ServiceProviderKeys}
                  searchValue={searchValue}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" responsive={false}>
              {supportedBySolutions}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
    []
  );

  const handleProviderChange = useCallback<NonNullable<EuiSelectableProps['onChange']>>(
    (options) => {
      const selectedProvider = options.filter((option) => option.checked === 'on');
      if (selectedProvider != null && selectedProvider.length > 0) {
        onProviderChange(selectedProvider[0].label);
      }
      onClosePopover();
    },
    [onClosePopover, onProviderChange]
  );

  const EuiSelectableContent = useCallback<NonNullable<EuiSelectableProps['children']>>(
    (list, search) => (
      <>
        {search}
        {list}
      </>
    ),
    []
  );

  const searchProps: EuiSelectableProps['searchProps'] = useMemo(
    () => ({
      'data-test-subj': 'provider-super-select-search-box',
      placeholder: i18n.translate(
        'xpack.stackConnectors.components.inference.selectable.providerSearch',
        {
          defaultMessage: 'Search',
        }
      ),
      onSearch: onSearchProvider,
      incremental: false,
      compressed: true,
      fullWidth: true,
    }),
    [onSearchProvider]
  );

  return (
    <EuiSelectable
      data-test-subj="selectable-provider-input"
      isLoading={isLoading}
      renderOption={renderProviderOption}
      onChange={handleProviderChange}
      searchable
      searchProps={searchProps}
      singleSelection={true}
      options={getSelectableOptions(searchProviderValue)}
    >
      {EuiSelectableContent}
    </EuiSelectable>
  );
};

export const SelectableProvider = memo(SelectableProviderComponent);
