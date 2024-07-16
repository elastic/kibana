/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiTablePagination } from '@elastic/eui';
import { FindSLOResponse } from '@kbn/slo-schema';
import React from 'react';
import { useUrlSearchState } from '../../hooks/use_url_search_state';
import { SlosView } from '../slos_view';
import { SLOView } from '../toggle_slo_view';

export interface Props {
  sloList: FindSLOResponse | undefined;
  loading: boolean;
  error: boolean;
  view: SLOView;
}

export function UngroupedView({ sloList, loading, error, view }: Props) {
  const { state, onStateChange } = useUrlSearchState();
  const { page, perPage } = state;
  const { results = [], total = 0 } = sloList ?? {};

  return (
    <>
      <SlosView sloList={results} loading={loading} error={error} view={view} />
      {total > 0 && total > perPage ? (
        <EuiFlexItem>
          <EuiTablePagination
            pageCount={Math.ceil(total / perPage)}
            activePage={page}
            onChangePage={(newPage) => {
              onStateChange({ page: newPage });
            }}
            itemsPerPage={perPage}
            itemsPerPageOptions={[10, 25, 50, 100]}
            onChangeItemsPerPage={(newPerPage) => {
              onStateChange({ perPage: newPerPage, page: 0 });
            }}
          />
        </EuiFlexItem>
      ) : null}
    </>
  );
}
