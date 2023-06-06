/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export interface Props {
  loading: boolean;
  onChangeQuery: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CompositeSloListSearchBar({ loading, onChangeQuery }: Props) {
  return (
    <EuiFlexGroup direction="row" gutterSize="s">
      <EuiFlexItem grow>
        <EuiFieldSearch
          data-test-subj="o11yCompositeSloListSearchFilterSortBarFieldSearch"
          fullWidth
          isLoading={loading}
          onChange={onChangeQuery}
          placeholder={i18n.translate('xpack.observability.slo.compositeSlo.search', {
            defaultMessage: 'Search',
          })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
