/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { uniqueId, startsWith } from 'lodash';
import { EuiCallOut } from '@elastic/eui';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';
import { Typeahead } from './typeahead';
import { useSearchText, useUrlParams } from '../../../hooks';
import {
  esKuery,
  IIndexPattern,
  QuerySuggestion,
  DataPublicPluginSetup,
} from '../../../../../../../src/plugins/data/public';
import { useIndexPattern } from './use_index_pattern';

const Container = styled.div`
  margin-bottom: 4px;
`;

interface State {
  suggestions: QuerySuggestion[];
  isLoadingIndexPattern: boolean;
}

function convertKueryToEsQuery(kuery: string, indexPattern: IIndexPattern) {
  const ast = esKuery.fromKueryExpression(kuery);
  return esKuery.toElasticsearchQuery(ast, indexPattern);
}

interface Props {
  'aria-label': string;
  autocomplete: DataPublicPluginSetup['autocomplete'];
  'data-test-subj': string;
}

export function KueryBar({
  'aria-label': ariaLabel,
  autocomplete: autocompleteService,
  'data-test-subj': dataTestSubj,
}: Props) {
  const { loading, index_pattern: indexPattern } = useIndexPattern();
  const { updateSearchText } = useSearchText();

  const [state, setState] = useState<State>({
    suggestions: [],
    isLoadingIndexPattern: true,
  });
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);
  let currentRequestCheck: string;

  const [getUrlParams, updateUrlParams] = useUrlParams();
  const { search: kuery } = getUrlParams();

  useEffect(() => {
    updateSearchText(kuery);
  }, [kuery, updateSearchText]);

  const indexPatternMissing = loading && !indexPattern;

  async function onChange(inputValue: string, selectionStart: number) {
    if (!indexPattern) {
      return;
    }

    updateSearchText(inputValue);

    setIsLoadingSuggestions(true);
    setState({ ...state, suggestions: [] });

    const currentRequest = uniqueId();
    currentRequestCheck = currentRequest;

    try {
      const suggestions = (
        (await autocompleteService.getQuerySuggestions({
          language: 'kuery',
          indexPatterns: [indexPattern],
          query: inputValue,
          selectionStart,
          selectionEnd: selectionStart,
        })) || []
      )
        .filter((suggestion) => !startsWith(suggestion.text, 'span.'))
        .slice(0, 15);

      if (currentRequest !== currentRequestCheck) {
        return;
      }

      setIsLoadingSuggestions(false);
      setState({ ...state, suggestions });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error while fetching suggestions', e);
    }
  }

  function onSubmit(inputValue: string) {
    if (indexPattern === null) {
      return;
    }

    try {
      const res = convertKueryToEsQuery(inputValue, indexPattern);
      if (!res) {
        return;
      }

      updateUrlParams({ search: inputValue.trim() });
    } catch (e) {
      console.log('Invalid kuery syntax'); // eslint-disable-line no-console
    }
  }

  return (
    <Container>
      <Typeahead
        aria-label={ariaLabel}
        data-test-subj={dataTestSubj}
        disabled={indexPatternMissing}
        isLoading={isLoadingSuggestions || loading}
        initialValue={kuery}
        onChange={onChange}
        onSubmit={onSubmit}
        suggestions={state.suggestions}
        queryExample=""
      />

      {indexPatternMissing && !loading && (
        <EuiCallOut
          style={{ display: 'inline-block', marginTop: '10px' }}
          title={
            <div>
              <FormattedMessage
                id="xpack.uptime.kueryBar.indexPatternMissingWarningMessage"
                // TODO: we need to determine the best instruction to provide if the index pattern is missing
                defaultMessage="There was an error retrieving the index pattern."
              />
            </div>
          }
          color="warning"
          iconType="alert"
          size="s"
        />
      )}
    </Container>
  );
}
