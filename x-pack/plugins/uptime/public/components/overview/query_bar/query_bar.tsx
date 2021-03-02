/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { EuiFlexItem } from '@elastic/eui';
import {
  StatefulSearchBarProps,
  DataPublicPluginStartUi,
} from '../../../../../../../src/plugins/data/public/';
import { useIndexPattern } from './use_index_pattern';
import { useQueryBar } from './use_query_bar';
import { UptimeStartupPluginsContext } from '../../../contexts';

const SYNTAX_STORAGE = 'uptime:queryBarSyntax';

const EuiFlexItemStyled = styled(EuiFlexItem)`
  && {
    .globalQueryBar {
      padding: 0;
    }
  }
`;

export const QueryBar = () => {
  const { index_pattern: indexPattern, loading } = useIndexPattern();

  const { query, setQuery } = useQueryBar();

  const { data } = useContext(UptimeStartupPluginsContext);

  const SearchBar: ComponentType<StatefulSearchBarProps> = (data?.ui as DataPublicPluginStartUi)
    .SearchBar;

  return (
    <EuiFlexItemStyled grow={1} style={{ flexBasis: 485 }}>
      <SearchBar
        appName="uptime"
        indexPatterns={indexPattern ? [indexPattern] : []}
        showQueryBar={true}
        showFilterBar={false}
        showDatePicker={false}
        showQueryInput={true}
        customSubmitButton={<div />}
        nonKqlMode="text"
        iconType="search"
        isLoading={loading}
        isClearable={true}
        onQueryChange={({ query: queryN }) => {
          if (queryN?.language === 'text') {
            setQuery({ query: queryN.query as string, language: queryN.language });
          }
        }}
        onQuerySubmit={({ query: queryN }) => {
          if (queryN) setQuery({ query: queryN.query as string, language: queryN.language });
        }}
        query={query}
        aria-label={i18n.translate('xpack.uptime.filterBar.ariaLabel', {
          defaultMessage: 'Input filter criteria for the overview page',
        })}
        data-test-subj="xpack.uptime.filterBar"
        useDefaultBehaviors={false}
        autoSubmit={true}
        storageKey={SYNTAX_STORAGE}
      />
    </EuiFlexItemStyled>
  );
};
