/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { i18n } from '@kbn/i18n';
import { uniqueId } from 'lodash';
import React, { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { DataView } from '@kbn/data-plugin/common';
import { esKuery, QuerySuggestion } from '@kbn/data-plugin/public';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useDynamicDataViewFetcher } from '../../../hooks/use_dynamic_data_view';
import { fromQuery, toQuery } from '../links/url_helpers';
import { getBoolFilter } from './get_bool_filter';
// @ts-expect-error
import { Typeahead } from './typeahead';
import { useProcessorEvent } from './use_processor_event';

interface State {
  suggestions: QuerySuggestion[];
  isLoadingSuggestions: boolean;
}

function convertKueryToEsQuery(kuery: string, dataView: DataView) {
  const ast = esKuery.fromKueryExpression(kuery);
  return esKuery.toElasticsearchQuery(ast, dataView);
}

export function KueryBar(props: {
  placeholder?: string;
  boolFilter?: QueryDslQueryContainer[];
  prepend?: React.ReactNode | string;
  onSubmit?: (value: string) => void;
  onChange?: (value: string) => void;
  value?: string;
}) {
  const { path, query } = useApmParams('/*');

  const serviceName = 'serviceName' in path ? path.serviceName : undefined;
  const groupId = 'groupId' in path ? path.groupId : undefined;
  const environment = 'environment' in query ? query.environment : undefined;
  const _kuery = 'kuery' in query ? query.kuery : undefined;
  const kuery = props.value || _kuery;

  const history = useHistory();
  const [state, setState] = useState<State>({
    suggestions: [],
    isLoadingSuggestions: false,
  });
  const { urlParams } = useLegacyUrlParams();
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

  const { dataView } = useDynamicDataViewFetcher();

  const placeholder =
    props.placeholder ??
    i18n.translate('xpack.apm.kueryBar.placeholder', {
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
    if (typeof props.onChange === 'function') {
      props.onChange(inputValue);
    }
    if (dataView == null) {
      return;
    }

    setState({ ...state, suggestions: [], isLoadingSuggestions: true });

    const currentRequest = uniqueId();
    currentRequestCheck = currentRequest;

    try {
      const suggestions = (
        (await data.autocomplete.getQuerySuggestions({
          language: 'kuery',
          indexPatterns: [dataView],
          boolFilter:
            props.boolFilter ??
            getBoolFilter({
              groupId,
              processorEvent,
              serviceName,
              environment,
              urlParams,
            }),
          query: inputValue,
          selectionStart,
          selectionEnd: selectionStart,
          useTimeRange: true,
          method: 'terms_agg',
        })) || []
      ).slice(0, 15);

      if (currentRequest !== currentRequestCheck) {
        return;
      }

      setState({ ...state, suggestions, isLoadingSuggestions: false });
    } catch (e) {
      console.error('Error while fetching suggestions', e);
    }
  }

  function onSubmit(inputValue: string) {
    if (dataView == null) {
      return;
    }

    try {
      const res = convertKueryToEsQuery(inputValue, dataView as DataView);
      if (!res) {
        return;
      }

      if (typeof props.onSubmit === 'function') {
        props.onSubmit(inputValue.trim());
        return;
      }

      history.push({
        ...location,
        search: fromQuery({
          ...toQuery(location.search),
          kuery: inputValue.trim(),
        }),
      });
    } catch (e) {
      console.log('Invalid kuery syntax'); // eslint-disable-line no-console
    }
  }

  return (
    <Typeahead
      isLoading={state.isLoadingSuggestions}
      initialValue={kuery}
      onChange={onChange}
      onSubmit={onSubmit}
      suggestions={state.suggestions}
      placeholder={placeholder}
      prepend={props.prepend}
    />
  );
}
