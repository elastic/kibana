/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
import { EuiSearchBar, EuiPagination } from '@elastic/eui';
import { EuiSearchBarOnChangeArgs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Process } from '../../../common/types/process_tree';
import { useStyles } from './styles';

interface SessionViewSearchBarDeps {
  searchQuery: string;
  setSearchQuery(val: string): void;
  searchResults: Process[] | null;
  onProcessSelected(process: Process): void;
}

const translatePlaceholder = {
  placeholder: i18n.translate('xpack.sessionView.searchBar.searchBarKeyPlaceholder', {
    defaultMessage: 'Find...',
  }),
};

/**
 * The main wrapper component for the session view.
 */
export const SessionViewSearchBar = ({
  searchQuery,
  setSearchQuery,
  onProcessSelected,
  searchResults,
}: SessionViewSearchBarDeps) => {
  const showPagination = !!searchResults?.length;

  const styles = useStyles({ hasSearchResults: showPagination });

  const [selectedResult, setSelectedResult] = useState(0);

  const onSearch = ({ query }: EuiSearchBarOnChangeArgs) => {
    setSelectedResult(0);

    if (query) {
      setSearchQuery(query.text);
    } else {
      setSearchQuery('');
    }
  };

  useEffect(() => {
    if (searchResults) {
      const process = searchResults[selectedResult];

      if (process) {
        onProcessSelected(process);
      }
    }
  }, [searchResults, onProcessSelected, selectedResult]);

  return (
    <div data-test-subj="sessionView:searchInput" css={styles.searchBarWithResult}>
      <EuiSearchBar query={searchQuery} onChange={onSearch} box={translatePlaceholder} />
      {showPagination && (
        <EuiPagination
          data-test-subj="sessionView:searchPagination"
          css={styles.pagination}
          pageCount={searchResults.length}
          activePage={selectedResult}
          onPageClick={setSelectedResult}
          compressed
        />
      )}
    </div>
  );
};
