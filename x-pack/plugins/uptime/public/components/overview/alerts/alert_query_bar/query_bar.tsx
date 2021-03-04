/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType, useContext, useState } from 'react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { EuiFlexItem } from '@elastic/eui';
import { StatefulSearchBarProps } from '../../../../../../../../src/plugins/data/public/ui/search_bar';
import { DataPublicPluginStartUi } from '../../../../../../../../src/plugins/data/public';
import { UptimeStartupPluginsContext } from '../../../../contexts';
import { useQueryBar } from '../../query_bar/use_query_bar';
import { useIndexPattern } from '../../query_bar/use_index_pattern';

const EuiFlexItemStyled = styled(EuiFlexItem)`
  && {
    .globalQueryBar {
      padding: 0;
    }
  }
`;

export const AlertQueryBar = () => {
  const { index_pattern: indexPattern, loading } = useIndexPattern();

  const [query, setQuery] = useState('');

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
        iconType="search"
        isLoading={loading}
        isClearable={true}
        onQueryChange={() => {}}
        onQuerySubmit={({ query: queryN }) => {
          if (queryN) setQuery(queryN.query as string);
        }}
        query={{ query, language: 'kuery' }}
        aria-label={i18n.translate('xpack.uptime.filterBar.ariaLabel', {
          defaultMessage: 'Input filter criteria for the overview page',
        })}
        data-test-subj="xpack.uptime.filterBar"
        useDefaultBehaviors={false}
        autoSubmit={true}
        disableLanguageSwitcher={true}
      />
    </EuiFlexItemStyled>
  );
};
