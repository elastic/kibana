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
import { useUrlParams } from '../../../hooks';
import {
  esKuery,
  IIndexPattern,
  QuerySuggestion,
  DataPublicPluginSetup,
} from '../../../../../../../src/plugins/data/public';

const Container = styled.div`
  margin-bottom: 10px;
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
  loadIndexPattern: () => void;
  indexPattern: IIndexPattern | null;
  loading: boolean;
}

export function KueryBarComponent({
  'aria-label': ariaLabel,
  autocomplete: autocompleteService,
  'data-test-subj': dataTestSubj,
  loadIndexPattern,
  indexPattern,
  loading,
}: Props) {
  useEffect(() => {
    if (!indexPattern) {
      loadIndexPattern();
    }
  }, [indexPattern, loadIndexPattern]);

  const [state, setState] = useState<State>({
    suggestions: [],
    isLoadingIndexPattern: true,
  });
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);
  let currentRequestCheck: string;

  const [getUrlParams, updateUrlParams] = useUrlParams();
  const { search: kuery } = getUrlParams();

  const indexPatternMissing = loading && !indexPattern;

  async function onChange(inputValue: string, selectionStart: number) {
    if (!indexPattern) {
      return;
    }

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
        .filter(suggestion => !startsWith(suggestion.text, 'span.'))
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

      {indexPatternMissing && (
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
