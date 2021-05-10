/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiPagination } from '@elastic/eui';

export const DeprecationPagination: FunctionComponent<{
  pageCount: number;
  activePage: number;
  setPage: (page: number) => void;
}> = ({ pageCount, activePage, setPage }) => {
  return (
    <EuiFlexGroup justifyContent="spaceAround">
      <EuiFlexItem grow={false}>
        <EuiPagination pageCount={pageCount} activePage={activePage} onPageClick={setPage} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
