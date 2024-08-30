/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiSearchBar,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { ResultList } from './result_list';
import { ChatForm, ChatFormFields } from '../../types';
import { useSearchPreview } from '../../hooks/use_search_preview';

export const SearchMode: React.FC = () => {
  const searchRequest = useSearchPreview();
  const { euiTheme } = useEuiTheme();
  const { control, formState, handleSubmit } = useFormContext();
  const showResults = false;
  const sourceFields = useWatch<ChatForm, ChatFormFields.sourceFields>({
    name: ChatFormFields.sourceFields,
  });
  const {
    field: { onChange: searchBarOnChange, value: searchBarValue },
  } = useController<ChatForm, ChatFormFields.searchQuery>({
    name: ChatFormFields.searchQuery,
  });
  const updateSearchQuery = (query: string) => {
    searchBarOnChange(query);
    // TODO call endpoint through the hook
    searchRequest({ searchQuery: query });
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
            <EuiSearchBar onChange={({ queryText }) => updateSearchQuery(queryText)} />
          </EuiFlexItem>
          <EuiFlexItem className="eui-yScroll">
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                {showResults ? (
                  <ResultList />
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
