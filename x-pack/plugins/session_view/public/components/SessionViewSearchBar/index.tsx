/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
import { EuiSearchBar, EuiPagination } from '@elastic/eui';
import { EuiSearchBarOnChangeArgs } from '@elastic/eui';
import { Process } from '../../../common/types/process_tree';
import { useStyles } from './styles';

interface SessionViewSearchBarDeps {
  searchQuery: string;
  setSearchQuery(val: string): void;
  searchResults: Process[] | null;
  setSelectedProcess(process: Process): void;
}

/**
 * The main wrapper component for the session view.
 */
export const SessionViewSearchBar = ({
  searchQuery,
  setSearchQuery,
  setSelectedProcess,
  searchResults,
}: SessionViewSearchBarDeps) => {
  const styles = useStyles();

  const [selectedResult, setSelectedResult] = useState(0);

  const onSearch = ({ query }: EuiSearchBarOnChangeArgs) => {
    setSelectedResult(0);

    if (query) {
      setSearchQuery(query.text);
    } else {
      setSearchQuery('');
    }
  };

  const onSelectResult = (index: number) => {
    if (searchResults) {
      const process = searchResults[index];

      setSelectedProcess(process);
      setSelectedResult(index);
    }
  };

  const renderSearchResults = () => {
    if (searchResults?.length) {
      return (
        <EuiPagination
          data-test-subj="searchPagination"
          css={styles.pagination}
          pageCount={searchResults.length}
          activePage={selectedResult}
          onPageClick={onSelectResult}
          compressed
        />
      );
    }
  };

  useEffect(() => {
    if (searchResults) {
      const process = searchResults[selectedResult];

      setSelectedProcess(process);
    }
  }, [searchResults, setSelectedProcess, selectedResult]);

  return (
    <div data-test-subj="searchInput" css={{ position: 'relative' }}>
      <EuiSearchBar query={searchQuery} onChange={onSearch} />
      {renderSearchResults()}
    </div>
  );
};
