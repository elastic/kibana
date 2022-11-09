/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFieldSearch } from '@elastic/eui';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import { useGetUrlParams, useUrlParams } from '../../../hooks';

export function SearchField() {
  const { query } = useGetUrlParams();
  const [_, updateUrlParams] = useUrlParams();

  const [search, setSearch] = useState(query || '');

  useDebounce(
    () => {
      if (search !== query) {
        updateUrlParams({ query: search });
      }
    },
    300,
    [search]
  );

  return (
    <EuiFieldSearch
      fullWidth
      placeholder={PLACEHOLDER_TEXT}
      value={search}
      onChange={(e) => {
        setSearch(e.target.value);
      }}
      isClearable={true}
      aria-label={PLACEHOLDER_TEXT}
      data-test-subj="syntheticsOverviewSearchInput"
    />
  );
}

const PLACEHOLDER_TEXT = i18n.translate('xpack.synthetics.monitorManagement.filter.placeholder', {
  defaultMessage: `Search by name, url, host, tag, project or location`,
});
