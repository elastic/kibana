/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FieldValueSuggestions } from '@kbn/observability-shared-plugin/public';
import { SLO_SUMMARY_DESTINATION_INDEX_NAME } from '../../../../../common/slo/constants';
import { SearchState } from '../../hooks/use_url_search_state';

interface Props {
  initialState: SearchState;
  loading: boolean;
  onStateChange: (newState: Partial<SearchState>) => void;
}

export function TagsFilter({ initialState, onStateChange, loading }: Props) {
  return (
    <EuiFilterGroup>
      <FieldValueSuggestions
        filters={[]}
        asFilterButton={true}
        asCombobox={false}
        selectedValue={initialState.tags?.included ?? []}
        excludedValue={initialState.tags?.excluded ?? []}
        dataViewTitle={SLO_SUMMARY_DESTINATION_INDEX_NAME}
        sourceField="slo.tags"
        label={TAGS_LABEL}
        onChange={(val, excludedValue) => {
          onStateChange({
            tags: {
              included: val,
              excluded: excludedValue,
            },
          });
        }}
      />
    </EuiFilterGroup>
  );
}

const TAGS_LABEL = i18n.translate('xpack.observability.slo.list.tags', {
  defaultMessage: 'Tags',
});
