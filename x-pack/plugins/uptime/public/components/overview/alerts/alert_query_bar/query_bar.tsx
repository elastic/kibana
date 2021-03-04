/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType, useContext, useState } from 'react';
import styled from 'styled-components';
import { EuiFlexItem } from '@elastic/eui';
import { StatefulSearchBarProps } from '../../../../../../../../src/plugins/data/public';
import { DataPublicPluginStartUi } from '../../../../../../../../src/plugins/data/public';
import { UptimeStartupPluginsContext } from '../../../../contexts';
import { useIndexPattern } from '../../query_bar/use_index_pattern';
import * as labels from '../translations';

const EuiFlexItemStyled = styled(EuiFlexItem)`
  && {
    .globalQueryBar {
      padding: 0;
    }
  }
`;

interface Props {
  query: string;
  onChange: (query: string) => void;
}

export const AlertQueryBar = ({ query, onChange }: Props) => {
  const { index_pattern: indexPattern, loading } = useIndexPattern();

  const [inputVal, setInputVal] = useState();

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
        onQueryChange={({ query: queryN }) => {
          setInputVal(queryN?.query);
        }}
        onQuerySubmit={({ query: queryN }) => {
          if (queryN) onChange(queryN.query as string);
        }}
        query={{ query, language: 'kuery' }}
        aria-label={labels.ALERT_KUERY_BAR_ARIA}
        data-test-subj="xpack.uptime.alerts.monitorStatus.filterBar"
        useDefaultBehaviors={false}
        autoSubmit={true}
        disableLanguageSwitcher={true}
        isInvalid={inputVal && !query}
      />
    </EuiFlexItemStyled>
  );
};
