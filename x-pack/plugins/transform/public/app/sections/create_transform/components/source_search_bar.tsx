/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { EuiCode, EuiInputPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { PLUGIN } from '../../../../../common/constants';

import { useAppDependencies } from '../../../app_dependencies';

import { useDataView } from './wizard/wizard';
import { useSearchBar } from './step_define/hooks/use_search_bar';
import { QUERY_LANGUAGE_KUERY } from './step_define';

export const SourceSearchBar: FC = () => {
  const {
    actions: { searchChangeHandler, searchSubmitHandler, setQueryErrorMessage },
    state: { queryErrorMessage, searchInput },
  } = useSearchBar();

  const dataView = useDataView();

  const {
    unifiedSearch: {
      ui: { QueryStringInput },
    },
  } = useAppDependencies();

  return (
    <EuiInputPopover
      style={{ maxWidth: '100%' }}
      closePopover={() => setQueryErrorMessage(undefined)}
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
          appName={PLUGIN.getI18nName()}
        />
      }
      isOpen={queryErrorMessage?.query === searchInput.query && queryErrorMessage?.message !== ''}
    >
      <EuiCode>
        {i18n.translate('xpack.transform.stepDefineForm.invalidKuerySyntaxErrorMessageQueryBar', {
          defaultMessage: 'Invalid query: {queryErrorMessage}',
          values: {
            queryErrorMessage: queryErrorMessage?.message.split('\n')[0],
          },
        })}
      </EuiCode>
    </EuiInputPopover>
  );
};
