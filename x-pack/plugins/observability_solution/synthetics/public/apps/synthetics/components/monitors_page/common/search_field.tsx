/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useRef } from 'react';
import { EuiFieldSearch } from '@elastic/eui';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import { useGetUrlParams, useUrlParams } from '../../../hooks';

export function SearchField() {
  const { query } = useGetUrlParams();
  const [_, updateUrlParams] = useUrlParams();

  const [search, setSearch] = useState<undefined | string>('');

  useDebounce(
    () => {
      if (search !== query) {
        updateUrlParams({ query: search });
      }
    },
    300,
    [search]
  );

  // Hydrate search input
  const hasInputChangedRef = useRef(false);
  useEffect(() => {
    if (query !== search && !hasInputChangedRef.current) {
      setSearch(query);
    }

    // Run only to sync url with input
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <EuiFieldSearch
      css={{ minWidth: 230 }}
      fullWidth
      placeholder={PLACEHOLDER_TEXT}
      value={search}
      onChange={(e) => {
        hasInputChangedRef.current = true;
        setSearch(e.target.value ?? '');
      }}
      isClearable={true}
      aria-label={PLACEHOLDER_TEXT}
      data-test-subj="syntheticsOverviewSearchInput"
    />
  );
}

const PLACEHOLDER_TEXT = i18n.translate('xpack.synthetics.monitorManagement.filter.placeholder', {
  defaultMessage: `Search by name, URL, host, tag, project or location`,
});
