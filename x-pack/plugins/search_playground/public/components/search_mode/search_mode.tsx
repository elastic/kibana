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
import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import { Controller, useController, useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { DEFAULT_PAGINATION } from '../../../common';
import { ResultList } from './result_list';
import { ChatForm, ChatFormFields } from '../../types';
import { useSearchPreview } from '../../hooks/use_search_preview';
import { getPaginationFromPage } from '../../utils/pagination_helper';

export const SearchMode: React.FC = () => {
  const {
    data: { results, pagination, isInitialState },
    fetchSearchResults,
  } = useSearchPreview();
  const { euiTheme } = useEuiTheme();
  const { control, handleSubmit } = useFormContext();
  const {
    field: { onChange: searchBarOnChange, value: searchBarValue },
    formState: { isSubmitting },
  } = useController<ChatForm, ChatFormFields.searchQuery>({
    name: ChatFormFields.searchQuery,
  });

  const updateSearchQuery = useCallback(
    (query: string) => {
      searchBarOnChange(query);
    },
    [searchBarOnChange]
  );
  const handleSearch = async (query = searchBarValue, paginationParam = DEFAULT_PAGINATION) => {
    try {
      await fetchSearchResults({ query, pagination: paginationParam });
    } catch (e) {
      // TODO handle error ?
    }
  };

  const onPagination = (page: number) => {
    handleSearch(searchBarValue, getPaginationFromPage(page, pagination.size, pagination));
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
            <EuiForm component="form" onSubmit={handleSubmit(() => handleSearch())}>
              <Controller
                control={control}
                name={ChatFormFields.searchQuery}
                render={({ field }) => (
                  <EuiFieldText
                    {...field}
                    value={searchBarValue}
                    icon="search"
                    fullWidth
                    placeholder="Search for documents"
                    onChange={(e) => updateSearchQuery(e.target.value)}
                    isLoading={isSubmitting}
                  />
                )}
              />
            </EuiForm>
          </EuiFlexItem>
          <EuiFlexItem className="eui-yScroll">
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                {!isInitialState ? (
                  <ResultList
                    searchResults={results}
                    pagination={pagination}
                    onPaginationChange={onPagination}
                  />
                ) : (
                  <EuiEmptyPrompt
                    iconType={'checkInCircleFilled'}
                    iconColor="success"
                    title={
                      <h2>
                        {i18n.translate('xpack.searchPlayground.searchMode.readyToSearch', {
                          defaultMessage: 'Ready to search',
                        })}
                      </h2>
                    }
                    body={
                      <p>
                        {i18n.translate('xpack.searchPlayground.searchMode.searchPrompt', {
                          defaultMessage:
                            'Type in a query in the search bar above or view the query we automatically created for you.',
                        })}
                      </p>
                    }
                    actions={
                      <EuiButton>
                        {i18n.translate('xpack.searchPlayground.searchMode.viewQuery', {
                          defaultMessage: 'View the query',
                        })}
                      </EuiButton>
                    }
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
