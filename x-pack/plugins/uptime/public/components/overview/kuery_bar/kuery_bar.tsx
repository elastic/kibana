/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiCallOut, htmlIdGenerator } from '@elastic/eui';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';
import { Typeahead } from './typeahead';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { useSearchText, useUrlParams } from '../../../hooks';
import {
  esKuery,
  IIndexPattern,
  QuerySuggestion,
  DataPublicPluginStart,
} from '../../../../../../../src/plugins/data/public';
import { useIndexPattern } from './use_index_pattern';

const Container = styled.div`
  margin-bottom: 4px;
  position: relative;
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
  defaultKuery?: string;
  'data-test-subj': string;
  shouldUpdateUrl?: boolean;
  updateDefaultKuery?: (value: string) => void;
}

export function KueryBar({
  'aria-label': ariaLabel,
  defaultKuery,
  'data-test-subj': dataTestSubj,
  shouldUpdateUrl,
  updateDefaultKuery,
}: Props) {
  const { loading, index_pattern: indexPattern } = useIndexPattern();
  const { updateSearchText } = useSearchText();

  const {
    services: {
      data: { autocomplete },
    },
  } = useKibana<{ data: DataPublicPluginStart }>();

  const [state, setState] = useState<State>({
    suggestions: [],
    isLoadingIndexPattern: true,
  });
  const [suggestionLimit, setSuggestionLimit] = useState(15);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);
  let currentRequestCheck: string;

  const [getUrlParams, updateUrlParams] = useUrlParams();
  const { search: kuery } = getUrlParams();

  useEffect(() => {
    updateSearchText(kuery);
  }, [kuery, updateSearchText]);

  useEffect(() => {
    if (updateDefaultKuery && kuery) {
      updateDefaultKuery(kuery);
    } else if (defaultKuery && updateDefaultKuery) {
      updateDefaultKuery(defaultKuery);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const indexPatternMissing = loading && !indexPattern;

  async function onChange(inputValue: string, selectionStart: number | null) {
    if (!indexPattern) {
      return;
    }

    setIsLoadingSuggestions(true);
    setState({ ...state, suggestions: [] });
    setSuggestionLimit(15);

    const currentRequest = htmlIdGenerator()();
    currentRequestCheck = currentRequest;

    try {
      const suggestions = (
        (await autocomplete.getQuerySuggestions({
          language: 'kuery',
          indexPatterns: [indexPattern],
          query: inputValue,
          selectionStart: selectionStart || 0,
          selectionEnd: selectionStart || 0,
          useTimeRange: true,
        })) || []
      ).filter((suggestion: QuerySuggestion) => !suggestion.text.startsWith('span.'));
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

      if (shouldUpdateUrl !== false) {
        updateUrlParams({ search: inputValue.trim() });
      }
      updateSearchText(inputValue);
      if (updateDefaultKuery) {
        updateDefaultKuery(inputValue);
      }
    } catch (e) {
      console.log('Invalid kuery syntax'); // eslint-disable-line no-console
    }
  }

  const increaseLimit = () => {
    setSuggestionLimit(suggestionLimit + 15);
  };

  return (
    <Container>
      <Typeahead
        ariaLabel={ariaLabel}
        dataTestSubj={dataTestSubj}
        disabled={indexPatternMissing}
        isLoading={isLoadingSuggestions || loading}
        initialValue={defaultKuery || kuery}
        onChange={onChange}
        onSubmit={onSubmit}
        suggestions={state.suggestions.slice(0, suggestionLimit)}
        loadMore={increaseLimit}
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
