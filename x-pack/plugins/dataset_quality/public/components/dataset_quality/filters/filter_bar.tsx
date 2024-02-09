/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';

import { type SearchBarOwnProps } from '@kbn/unified-search-plugin/public/search_bar';
import { fromKueryExpression, type Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiTextColor } from '@elastic/eui';
import { SuggestionsAbstraction } from '@kbn/unified-search-plugin/public/typeahead/suggestions_component';
import { useAdHocDataView } from '../../../hooks/use_adhoc_data_view';
import { useKibanaContextForPlugin } from '../../../utils';

const SEARCH_BAR_SUGGESTIONS: SuggestionsAbstraction = {
  type: 'logs',
  fields: {
    'data_stream.dataset': {
      field: 'data_stream.dataset',
      fieldToQuery: 'data_stream.dataset',
      displayField: 'name',
    },
    'data_stream.namespace': {
      field: 'data_stream.namespace',
      fieldToQuery: 'data_stream.namespace',
      displayField: 'namespace',
    },
  },
};

export interface FilterBarComponentProps {
  query: Query['query'];
  onQueryChange: (update: Query['query']) => void;
}

export const FilterBar = ({ query, onQueryChange }: FilterBarComponentProps) => {
  const {
    services: {
      unifiedSearch: {
        ui: { SearchBar },
      },
    },
  } = useKibanaContextForPlugin();

  const { dataView } = useAdHocDataView(SEARCH_BAR_SUGGESTIONS);

  const [error, setError] = useState<string | undefined>();

  const onQuerySubmit: SearchBarOwnProps['onQuerySubmit'] = useCallback(
    (payload, isUpdate) => {
      try {
        // Validates the query
        const kueryNodes = fromKueryExpression(payload.query.query);
        setError(undefined);
        onQueryChange(payload.query.query);
      } catch (e) {
        setError(e.message);
      }
    },
    [onQueryChange]
  );

  return (
    <>
      <SearchBar
        appName={i18n.translate('xpack.apm.appName', {
          defaultMessage: 'dataset-quality',
        })}
        iconType="search"
        placeholder={'Filter datasets'}
        useDefaultBehaviors={true}
        indexPatterns={dataView ? [dataView] : []}
        showQueryInput={true}
        showQueryMenu={false}
        showFilterBar={false}
        showDatePicker={false}
        showSubmitButton={false}
        displayStyle="inPage"
        onQuerySubmit={onQuerySubmit}
        isClearable={true}
        suggestionsAbstraction={SEARCH_BAR_SUGGESTIONS}
      />

      {error ? (
        <>
          <EuiSpacer size={'s'} />
          <EuiTextColor color="danger">{error}</EuiTextColor>
        </>
      ) : null}
    </>
  );
};
