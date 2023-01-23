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

import { indexHealthToHealthColor } from '../../../../shared/indices/utils';
import { FetchIndicesForEnginesAPILogic } from '../../../api/engines/fetch_indices_api_logic';

export type IndicesSelectComboBoxProps = Omit<
  EuiComboBoxProps<ElasticsearchIndexWithIngestion>,
  'onCreateOption' | 'onSearchChange' | 'noSuggestions' | 'async'
> & {
  'data-telemetry-id'?: string;
};

export const IndicesSelectComboBox = (props: IndicesSelectComboBoxProps) => {
  const [searchQuery, setSearchQuery] = useState<string | undefined>(undefined);
  const { makeRequest } = useActions(FetchIndicesForEnginesAPILogic);
  const { status, data } = useValues(FetchIndicesForEnginesAPILogic);

  useEffect(() => {
    makeRequest({ searchQuery });
  }, [searchQuery]);

  const options: Array<EuiComboBoxOptionOption<ElasticsearchIndexWithIngestion>> =
    data?.indices?.map(indexToOption) ?? [];

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
            {i18n.translate('xpack.enterpriseSearch.content.engine.indicesSelect.docsLabel', {
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
  index: ElasticsearchIndexWithIngestion
): EuiComboBoxOptionOption<ElasticsearchIndexWithIngestion> => ({
  label: index.name,
  value: index,
});
