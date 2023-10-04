/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiComboBox,
  EuiComboBoxProps,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHighlight,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedNumber } from '@kbn/i18n-react';

import { Status } from '../../../../../../common/types/api';
import { ElasticsearchIndexWithIngestion } from '../../../../../../common/types/indices';

import { indexHealthToHealthColor } from '../../../../shared/constants/health_colors';
import { FetchIndicesForSearchApplicationsAPILogic } from '../../../api/search_applications/fetch_indices_api_logic';

export type IndicesSelectComboBoxOption = EuiComboBoxOptionOption<ElasticsearchIndexWithIngestion>;

export type IndicesSelectComboBoxProps = Omit<
  EuiComboBoxProps<ElasticsearchIndexWithIngestion>,
  'onCreateOption' | 'onSearchChange' | 'noSuggestions' | 'async'
> & {
  'data-telemetry-id'?: string;
  ignoredOptions?: string[];
};

export const IndicesSelectComboBox = ({ ignoredOptions, ...props }: IndicesSelectComboBoxProps) => {
  const [searchQuery, setSearchQuery] = useState<string | undefined>(undefined);
  const { makeRequest } = useActions(FetchIndicesForSearchApplicationsAPILogic);
  const { status, data } = useValues(FetchIndicesForSearchApplicationsAPILogic);

  useEffect(() => {
    makeRequest({ searchQuery });
  }, [searchQuery]);

  const options: Array<EuiComboBoxOptionOption<ElasticsearchIndexWithIngestion>> =
    (ignoredOptions && ignoredOptions.length > 0
      ? data?.indices
          ?.filter((index) => !ignoredOptions.includes(index.name))
          ?.map((index) => indexToOption(index.name, index))
      : data?.indices?.map((index) => indexToOption(index.name, index))) ?? [];

  const renderOption = (option: EuiComboBoxOptionOption<ElasticsearchIndexWithIngestion>) => (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiHealth color={indexHealthToHealthColor(option.value?.health)}>
          <EuiHighlight search={searchQuery ?? ''}>{option.value?.name ?? ''}</EuiHighlight>
        </EuiHealth>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <span>
          <strong>
            {i18n.translate('xpack.enterpriseSearch.searchApplications.indicesSelect.docsLabel', {
              defaultMessage: 'Docs:',
            })}
          </strong>
        </span>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FormattedNumber value={option.value?.count ?? 0} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const defaultedProps: EuiComboBoxProps<ElasticsearchIndexWithIngestion> = {
    isLoading: status === Status.LOADING,
    onSearchChange: (searchValue?: string) => {
      setSearchQuery(searchValue);
    },
    options,
    renderOption,
    ...props,
  };
  return <EuiComboBox async {...defaultedProps} />;
};

export const indexToOption = (
  indexName: string,
  index?: ElasticsearchIndexWithIngestion
): IndicesSelectComboBoxOption => ({
  label: indexName,
  value: index,
});
