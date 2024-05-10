/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, useCallback } from 'react';
import { EuiFieldSearch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const placeholder = i18n.translate('xpack.datasetQuality.filterBar.placeholder', {
  defaultMessage: 'Filter datasets',
});

export interface FilterBarComponentProps {
  query?: string;
  onQueryChange: (query: string) => void;
}

export const FilterBar = ({ query, onQueryChange }: FilterBarComponentProps) => {
  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onQueryChange(event.target.value);
    },
    [onQueryChange]
  );

  return (
    <EuiFieldSearch
      data-test-subj="datasetQualityFilterBarFieldSearch"
      fullWidth
      placeholder={placeholder}
      value={query ?? ''}
      onChange={onChange}
      isClearable={true}
      aria-label={placeholder}
    />
  );
};
