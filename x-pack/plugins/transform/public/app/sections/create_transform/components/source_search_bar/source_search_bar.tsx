/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, FC } from 'react';

import { EuiCode, EuiFormRow, EuiInputPopover } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { QueryStringInput } from '../../../../../../../../../src/plugins/data/public';

import { SearchItems } from '../../../../hooks/use_search_items';

import { StepDefineFormContext, QUERY_LANGUAGE_KUERY } from '../step_define';

interface SourceSearchBarProps {
  indexPattern: SearchItems['indexPattern'];
}
export const SourceSearchBar: FC<SourceSearchBarProps> = ({ indexPattern }) => {
  const { actions, state } = useContext(StepDefineFormContext);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.transform.stepDefineForm.queryLabel', {
        defaultMessage: 'Query',
      })}
      helpText={i18n.translate('xpack.transform.stepDefineForm.queryHelpText', {
        defaultMessage: 'Use a query to filter the source data (optional).',
      })}
    >
      <EuiInputPopover
        style={{ maxWidth: '100%' }}
        closePopover={() => actions.setErrorMessage(undefined)}
        input={
          <QueryStringInput
            bubbleSubmitEvent={true}
            query={state.searchInput}
            indexPatterns={[indexPattern]}
            onChange={actions.searchChangeHandler}
            onSubmit={actions.searchSubmitHandler}
            placeholder={
              state.searchInput.language === QUERY_LANGUAGE_KUERY
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
        isOpen={
          state.errorMessage?.query === state.searchInput.query &&
          state.errorMessage?.message !== ''
        }
      >
        <EuiCode>
          {i18n.translate('xpack.transform.stepDefineForm.invalidKuerySyntaxErrorMessageQueryBar', {
            defaultMessage: 'Invalid query',
          })}
          {': '}
          {state.errorMessage?.message.split('\n')[0]}
        </EuiCode>
      </EuiInputPopover>
    </EuiFormRow>
  );
};
