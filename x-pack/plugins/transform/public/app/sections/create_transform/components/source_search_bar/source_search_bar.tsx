/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { EuiCode, EuiInputPopover } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { QueryStringInput } from '@kbn/unified-search-plugin/public';

import { SearchItems } from '../../../../hooks/use_search_items';

import { StepDefineFormHook, QUERY_LANGUAGE_KUERY } from '../step_define';

interface SourceSearchBarProps {
  dataView: SearchItems['dataView'];
  searchBar: StepDefineFormHook['searchBar'];
}
export const SourceSearchBar: FC<SourceSearchBarProps> = ({ dataView, searchBar }) => {
  const {
    actions: { searchChangeHandler, searchSubmitHandler, setErrorMessage },
    state: { errorMessage, searchInput },
  } = searchBar;

  return (
    <EuiInputPopover
      style={{ maxWidth: '100%' }}
      closePopover={() => setErrorMessage(undefined)}
      input={
        <QueryStringInput
          bubbleSubmitEvent={true}
          query={searchInput}
          indexPatterns={[dataView]}
          onChange={searchChangeHandler}
          onSubmit={searchSubmitHandler}
          placeholder={
            searchInput.language === QUERY_LANGUAGE_KUERY
              ? i18n.translate('xpack.transform.stepDefineForm.queryPlaceholderKql', {
                  defaultMessage: 'e.g. {example}',
                  values: { example: 'method : "GET" or status : "404"' },
                })
              : i18n.translate('xpack.transform.stepDefineForm.queryPlaceholderLucene', {
                  defaultMessage: 'e.g. {example}',
                  values: { example: 'method:GET OR status:404' },
                })
          }
          disableAutoFocus={true}
          dataTestSubj="transformQueryInput"
          languageSwitcherPopoverAnchorPosition="rightDown"
        />
      }
      isOpen={errorMessage?.query === searchInput.query && errorMessage?.message !== ''}
    >
      <EuiCode>
        {i18n.translate('xpack.transform.stepDefineForm.invalidKuerySyntaxErrorMessageQueryBar', {
          defaultMessage: 'Invalid query: {errorMessage}',
          values: {
            errorMessage: errorMessage?.message.split('\n')[0],
          },
        })}
      </EuiCode>
    </EuiInputPopover>
  );
};
