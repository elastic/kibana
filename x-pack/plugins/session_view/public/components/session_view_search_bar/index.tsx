/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback } from 'react';
import { EuiSearchBar, EuiPagination } from '@elastic/eui';
import { EuiSearchBarOnChangeArgs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStyles } from './styles';

interface SessionViewSearchBarDeps {
  searchQuery: string;
  setSearchQuery(val: string): void;
  totalMatches: number;
  onPrevious: (index: number) => void;
  onNext: (index: number) => void;
}

const translatePlaceholder = {
  placeholder: i18n.translate('xpack.sessionView.searchBar.searchBarKeyPlaceholder', {
    defaultMessage: 'Find...',
  }),
};

const NO_RESULTS = i18n.translate('xpack.sessionView.searchBar.searchBarNoResults', {
  defaultMessage: 'No results',
});

/**
 * The main wrapper component for the session view.
 */
export const SessionViewSearchBar = ({
  searchQuery,
  setSearchQuery,
  totalMatches,
  onPrevious,
  onNext,
}: SessionViewSearchBarDeps) => {
  const showPagination = !!searchQuery && totalMatches !== 0;
  const noResults = !!searchQuery && totalMatches === 0;

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

  const onPageClick = useCallback(
    (page: number) => {
      setSelectedResult(page);

      if (page > selectedResult) {
        onNext(page);
      } else {
        onPrevious(page);
      }
    },
    [onNext, onPrevious, selectedResult]
  );

  return (
    <div data-test-subj="sessionView:searchBar" css={styles.searchBar}>
      <EuiSearchBar query={searchQuery} onChange={onSearch} box={translatePlaceholder} />
      {noResults && <span css={styles.noResults}>{NO_RESULTS}</span>}
      {showPagination && (
        <EuiPagination
          data-test-subj="sessionView:searchPagination"
          css={styles.pagination}
          pageCount={totalMatches}
          activePage={selectedResult}
          onPageClick={onPageClick}
          compressed
        />
      )}
    </div>
  );
};
