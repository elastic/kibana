/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption, EuiSelectableProps } from '@elastic/eui';
import { EuiSelectable, EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { InferenceProvider, useProviders } from '../get_providers';
import {
  SERVICE_PROVIDERS,
  ServiceProviderIcon,
  ServiceProviderName,
} from '../render_service_provider/service_provider';
import { ServiceProviderKeys } from '../../types';

/**
 * Modifies options by creating new property `providerTitle`(with value of `title`), and by setting `title` to undefined.
 * Thus prevents appearing default browser tooltip on option hover (attribute `title` that gets rendered on li element)
 *
 * @param {EuiSelectableOption[]} options
 * @returns {EuiSelectableOption[]} modified options
 */

export interface GetSelectableOptions {
  providers: InferenceProvider[];
  searchProviderValue: string;
}

export interface SelectableProviderProps {
  getSelectableOptions: ({
    providers,
    searchProviderValue,
  }: GetSelectableOptions) => EuiSelectableOption[];
  onClosePopover: () => void;
  onProviderChange: (provider?: InferenceProvider) => void;
}

const SelectableProviderComponent: React.FC<SelectableProviderProps> = ({
  getSelectableOptions,
  onClosePopover,
  onProviderChange,
}) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const [searchProviderValue, setSearchProviderValue] = useState<string>('');
  const { data, isLoading } = useProviders(http, toasts);
  const onSearchProvider = useCallback(
    (val: string) => {
      setSearchProviderValue(val);
    },
    [setSearchProviderValue]
  );

  const renderProviderOption = useCallback<NonNullable<EuiSelectableProps['renderOption']>>(
    (option, searchValue) => {
      const provider = SERVICE_PROVIDERS[option.label as ServiceProviderKeys];
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
              {provider &&
                provider.solutions.map((solution) => (
                  <EuiFlexItem>
                    <EuiBadge color="hollow">{solution}</EuiBadge>
                  </EuiFlexItem>
                ))}
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
        onProviderChange(data?.find((p) => p.provider === selectedProvider[0].label));
      }
      onClosePopover();
    },
    [data, onClosePopover, onProviderChange]
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
      isLoading={isLoading && data == null}
      renderOption={renderProviderOption}
      onChange={handleProviderChange}
      searchable
      searchProps={searchProps}
      singleSelection={true}
      options={getSelectableOptions({
        providers: data ?? [],
        searchProviderValue,
      })}
    >
      {EuiSelectableContent}
    </EuiSelectable>
  );
};

export const SelectableProvider = memo(SelectableProviderComponent);
