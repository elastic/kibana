/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { startsWith, uniqueId } from 'lodash';
import React, { useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  esKuery,
  IIndexPattern,
  QuerySuggestion,
} from '../../../../../../../src/plugins/data/public';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useDynamicIndexPatternFetcher } from '../../../hooks/use_dynamic_index_pattern';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { fromQuery, toQuery } from '../Links/url_helpers';
import { getBoolFilter } from './get_bool_filter';
// @ts-expect-error
import { Typeahead } from './Typeahead';
import { useProcessorEvent } from './use_processor_event';

const Container = styled.div`
  margin-bottom: 10px;
`;

interface State {
  suggestions: QuerySuggestion[];
  isLoadingSuggestions: boolean;
}

function convertKueryToEsQuery(kuery: string, indexPattern: IIndexPattern) {
  const ast = esKuery.fromKueryExpression(kuery);
  return esKuery.toElasticsearchQuery(ast, indexPattern);
}

export function KueryBar(props: { prepend?: React.ReactNode | string }) {
  const { groupId, serviceName } = useParams<{
    groupId?: string;
    serviceName?: string;
  }>();
  const history = useHistory();
  const [state, setState] = useState<State>({
    suggestions: [],
    isLoadingSuggestions: false,
  });
  const { urlParams } = useUrlParams();
  const location = useLocation();
  const { data } = useApmPluginContext().plugins;

  let currentRequestCheck;

  const processorEvent = useProcessorEvent();

  const examples = {
    transaction: 'transaction.duration.us > 300000',
    error: 'http.response.status_code >= 400',
    metric: 'process.pid = "1234"',
    defaults:
      'transaction.duration.us > 300000 AND http.response.status_code >= 400',
  };

  const example = examples[processorEvent || 'defaults'];

  const { indexPattern } = useDynamicIndexPatternFetcher(processorEvent);

  const placeholder = i18n.translate('xpack.apm.kueryBar.placeholder', {
    defaultMessage: `Search {event, select,
            transaction {transactions}
            metric {metrics}
            error {errors}
            other {transactions, errors and metrics}
          } (E.g. {queryExample})`,
    values: {
      queryExample: example,
      event: processorEvent,
    },
  });

  async function onChange(inputValue: string, selectionStart: number) {
    if (indexPattern == null) {
      return;
    }

    setState({ ...state, suggestions: [], isLoadingSuggestions: true });

    const currentRequest = uniqueId();
    currentRequestCheck = currentRequest;

    try {
      const suggestions = (
        (await data.autocomplete.getQuerySuggestions({
          language: 'kuery',
          indexPatterns: [indexPattern],
          boolFilter: getBoolFilter({
            groupId,
            processorEvent,
            serviceName,
            urlParams,
          }),
          query: inputValue,
          selectionStart,
          selectionEnd: selectionStart,
          useTimeRange: true,
        })) || []
      )
        .filter((suggestion) => !startsWith(suggestion.text, 'span.'))
        .slice(0, 15);

      if (currentRequest !== currentRequestCheck) {
        return;
      }

      setState({ ...state, suggestions, isLoadingSuggestions: false });
    } catch (e) {
      console.error('Error while fetching suggestions', e);
    }
  }

  function onSubmit(inputValue: string) {
    if (indexPattern == null) {
      return;
    }

    try {
      const res = convertKueryToEsQuery(inputValue, indexPattern);
      if (!res) {
        return;
      }

      history.push({
        ...location,
        search: fromQuery({
          ...toQuery(location.search),
          kuery: encodeURIComponent(inputValue.trim()),
        }),
      });
    } catch (e) {
      console.log('Invalid kuery syntax'); // eslint-disable-line no-console
    }
  }

  return (
    <Container>
      <Typeahead
        isLoading={state.isLoadingSuggestions}
        initialValue={urlParams.kuery}
        onChange={onChange}
        onSubmit={onSubmit}
        suggestions={state.suggestions}
        placeholder={placeholder}
        prepend={props.prepend}
      />
    </Container>
  );
}
