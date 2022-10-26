/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FunctionComponent } from 'react';
import { EuiPagination } from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import { useFilePickerContext } from '../context';
import { useBehaviorSubject } from '../../use_behavior_subject';

export const Pagination: FunctionComponent = () => {
  const { state } = useFilePickerContext();
  const page = useBehaviorSubject(state.currentPage$);
  const files = useObservable(state.files$, []);
  const pageCount = useBehaviorSubject(state.totalPages$);
  const isUploading = useBehaviorSubject(state.isUploading$);
  if (files.length === 0) {
    return null;
  }
  return (
    <EuiPagination
      data-test-subj="paginationControls"
      onPageClick={isUploading ? () => {} : state.setPage}
      pageCount={pageCount}
      activePage={page}
    />
  );
};
