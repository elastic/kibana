/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem } from '@elastic/eui';
import { QueryStringInput } from '@kbn/unified-search-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SyntaxType, useQueryBar } from './use_query_bar';
import { KQL_PLACE_HOLDER, SIMPLE_SEARCH_PLACEHOLDER } from './translations';
import { useGetUrlParams, useUptimeDataView } from '../../../hooks';
import { ClientPluginsStart } from '../../../../plugin';

const SYNTAX_STORAGE = 'uptime:queryBarSyntax';

export const isValidKuery = (query: string) => {
  if (query === '') {
    return true;
  }
  const listOfOperators = [':', '>=', '=>', '>', '<'];
  for (let i = 0; i < listOfOperators.length; i++) {
    const operator = listOfOperators[i];
    const qParts = query.trim().split(operator);
    if (query.includes(operator) && qParts.length > 1 && qParts[1]) {
      return true;
    }
  }
  return false;
};

export const QueryBar = () => {
  const { search: urlValue } = useGetUrlParams();
  const { services } = useKibana<ClientPluginsStart>();

  const {
    appName,
    notifications,
    http,
    docLinks,
    uiSettings,
    data,
    dataViews,
    unifiedSearch,
    storage,
    usageCollection,
  } = services;
  const { query, setQuery, submitImmediately } = useQueryBar();

  const dataView = useUptimeDataView();

  const [inputVal, setInputVal] = useState<string>(query.query as string);

  const isInValid = () => {
    if (query.language === SyntaxType.text) {
      return false;
    }
    return inputVal?.trim() !== urlValue?.trim();
  };

  return (
    <EuiFlexItem grow={1} style={{ flexBasis: 485 }}>
      <QueryStringInput
        indexPatterns={dataView ? [dataView] : []}
        nonKqlMode="text"
        iconType="search"
        isClearable={true}
        onChange={(queryN) => {
          if (queryN?.language === SyntaxType.text) {
            setQuery({ query: queryN.query as string, language: queryN.language });
          }
          if (queryN?.language === SyntaxType.kuery && isValidKuery(queryN?.query as string)) {
            // we want to submit when user clears or paste a complete kuery
            setQuery({ query: queryN.query as string, language: queryN.language });
          }
          setInputVal(queryN?.query as string);
        }}
        onSubmit={(queryN) => {
          if (queryN) setQuery({ query: queryN.query as string, language: queryN.language });
          submitImmediately();
        }}
        query={{ ...query, query: inputVal }}
        aria-label={i18n.translate('xpack.synthetics.filterBar.ariaLabel', {
          defaultMessage: 'Input filter criteria for the overview page',
        })}
        data-test-subj="uptimeSearchBarInput"
        autoSubmit={true}
        storageKey={SYNTAX_STORAGE}
        placeholder={
          query.language === SyntaxType.kuery ? KQL_PLACE_HOLDER : SIMPLE_SEARCH_PLACEHOLDER
        }
        isInvalid={isInValid()}
        appName={appName}
        deps={{
          unifiedSearch,
          notifications,
          http,
          docLinks,
          uiSettings,
          data,
          dataViews,
          storage,
          usageCollection,
        }}
      />
    </EuiFlexItem>
  );
};
