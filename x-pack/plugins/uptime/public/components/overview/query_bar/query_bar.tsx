/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ComponentType, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { UptimeStartupPluginsContext } from '../../../contexts';
import { StatefulSearchBarProps } from '../../../../../../../src/plugins/data/public/ui/search_bar';
import { DataPublicPluginStartUi } from '../../../../../../../src/plugins/data/public';
import { useIndexPattern } from './../kuery_bar/use_index_pattern';
import { EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { useQueryBar } from './use_query_bar';

interface Props {}

const EuiFlexItemStyled = styled(EuiFlexItem)`
  && {
    .globalQueryBar {
      padding: 0;
    }
  }
`;

export const QueryBar = (props: Props) => {
  const { index_pattern: indexPattern, loading } = useIndexPattern();

  const [query, setQuery] = useQueryBar();

  const {
    data: { ui },
  } = useContext(UptimeStartupPluginsContext);

  const SearchBar: ComponentType<StatefulSearchBarProps> = (ui as DataPublicPluginStartUi)
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
        customSubmitButton={<div></div>}
        nonKqlMode="text"
        iconType="search"
        isLoading={loading}
        isClearable={true}
        onQueryChange={(queryN) => {
          if (queryN.query?.language === 'text') {
            setQuery(queryN.query);
          }
        }}
        onQuerySubmit={(queryN) => {
          setQuery(queryN.query);
        }}
        query={query}
        aria-label={i18n.translate('xpack.uptime.filterBar.ariaLabel', {
          defaultMessage: 'Input filter criteria for the overview page',
        })}
        data-test-subj="xpack.uptime.filterBar"
        useDefaultBehaviors={false}
        autoSubmit={true}
      />
    </EuiFlexItemStyled>
  );
};
