/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBoxOptionOption } from '@elastic/eui/src/components/combo_box/types';
import { IndexName } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { useQueryIndices } from '../../hooks/use_query_indices';

interface AddIndicesFieldProps {
  selectedIndices: IndexName[];
  onIndexSelect: (index: IndexName) => void;
}

export const AddIndicesField: React.FC<AddIndicesFieldProps> = ({
  selectedIndices,
  onIndexSelect,
}) => {
  const [query, setQuery] = useState<string>('');
  const { indices, isLoading } = useQueryIndices(query);
  const handleChange = (value: Array<EuiComboBoxOptionOption<IndexName>>) => {
    if (value?.[0]?.label) {
      onIndexSelect(value[0].label);
    }
  };
  const handleSearchChange = (searchValue: string) => {
    setQuery(searchValue);
  };

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('xpack.searchPlayground.sources.addIndex.label', {
        defaultMessage: 'Add index',
      })}
      labelType="legend"
    >
      <EuiComboBox
        singleSelection={{ asPlainText: true }}
        placeholder={i18n.translate('xpack.searchPlayground.sources.addIndex.placeholder', {
          defaultMessage: 'Select new data source',
        })}
        async
        isLoading={isLoading}
        onChange={handleChange}
        onSearchChange={handleSearchChange}
        fullWidth
        options={indices.map((index) => ({
          label: index,
          disabled: selectedIndices.includes(index),
        }))}
        isClearable={false}
      />
    </EuiFormRow>
  );
};
