/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { Controller, useController, useFormContext } from 'react-hook-form';
import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { ResultList } from './result_list';
import { ChatForm, ChatFormFields } from '../../types';
import { useSearchPreview } from '../../hooks/use_search_preview';

export const SearchMode: React.FC = () => {
  const [searchResults, setSearchResults] = React.useState<SearchHit[] | undefined>();
  const searchRequest = useSearchPreview();
  const { euiTheme } = useEuiTheme();
  const { control, handleSubmit } = useFormContext();
  const {
    field: { onChange: searchBarOnChange, value: searchBarValue },
  } = useController<ChatForm, ChatFormFields.searchQuery>({
    name: ChatFormFields.searchQuery,
  });

  const handleSearch = handleSubmit(async () => {
    try {
      const searchData = await searchRequest(searchBarValue);
      setSearchResults(searchData.results);
    } catch (e) {
      // TODO handle error ?
    }
  });

  const updateSearchQuery = (query: string) => {
    searchBarOnChange({ query, pagination: searchBarValue.pagination });
  };

  return (
    <EuiFlexGroup direction="row" justifyContent="center">
      <EuiFlexItem
        grow
        css={css`
          max-width: ${euiTheme.base * 48}px;
        `}
      >
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiForm component="form" onSubmit={handleSearch}>
              <Controller
                control={control}
                name={ChatFormFields.searchQuery}
                render={({ field }) => (
                  <EuiFieldText
                    {...field}
                    value={searchBarValue.query}
                    icon="search"
                    fullWidth
                    placeholder="Search for documents"
                    onChange={(e) => updateSearchQuery(e.target.value)}
                  />
                )}
              />
            </EuiForm>
          </EuiFlexItem>
          <EuiFlexItem className="eui-yScroll">
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                {searchResults ? (
                  <ResultList searchResults={searchResults} />
                ) : (
                  <EuiEmptyPrompt
                    iconType={'checkInCircleFilled'}
                    iconColor="success"
                    title={<h2>Ready to search</h2>}
                    body={
                      <p>
                        Type in a query in the search bar above or view the query we automatically
                        created for you.
                      </p>
                    }
                    actions={<EuiButton>View the query</EuiButton>}
                  />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
