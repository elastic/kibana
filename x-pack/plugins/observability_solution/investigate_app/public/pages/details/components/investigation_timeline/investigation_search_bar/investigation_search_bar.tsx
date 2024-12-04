/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import type { TimeRange } from '@kbn/es-query';
import type { SearchBar } from '@kbn/unified-search-plugin/public';
import React from 'react';
import { useKibana } from '../../../../../hooks/use_kibana';
import { InvestigationEventTypesFilter } from './investigation_event_types_filter';

interface Props {
  dateRangeFrom?: string;
  dateRangeTo?: string;
  onQuerySubmit: (payload: { dateRange: TimeRange }, isUpdate?: boolean) => void;
  onRefresh?: Required<React.ComponentProps<typeof SearchBar>>['onRefresh'];
  onEventTypesSelected: (eventTypes: string[]) => void;
}

export function InvestigationSearchBar({
  dateRangeFrom,
  dateRangeTo,
  onQuerySubmit,
  onRefresh,
  onEventTypesSelected,
}: Props) {
  const {
    dependencies: {
      start: {
        unifiedSearch: {
          ui: { SearchBar },
        },
      },
    },
  } = useKibana();

  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="s"
      alignItems="flexStart"
      justifyContent="spaceBetween"
      responsive
      css={css`
        padding: 8px 8px 0px 8px;
        max-height: fit-content;
      `}
    >
      <InvestigationEventTypesFilter onSelected={onEventTypesSelected} />

      <EuiFlexItem grow={false}>
        <SearchBar
          appName="investigate"
          onQuerySubmit={({ dateRange }) => {
            onQuerySubmit({ dateRange });
          }}
          showQueryInput={false}
          showFilterBar={false}
          showQueryMenu={false}
          showDatePicker
          showSubmitButton={true}
          dateRangeFrom={dateRangeFrom}
          dateRangeTo={dateRangeTo}
          onRefresh={onRefresh}
          displayStyle="inPage"
          disableQueryLanguageSwitcher
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
