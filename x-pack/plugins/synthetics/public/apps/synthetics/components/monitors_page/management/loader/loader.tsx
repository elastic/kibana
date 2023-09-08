/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { PageLoader } from '../../../common/components/page_loader';

interface Props {
  loading: boolean;
  loadingTitle: React.ReactNode;
  error: boolean;
  errorTitle?: React.ReactNode;
  errorBody?: React.ReactNode;
  children: React.ReactNode;
}

export const Loader = ({
  loading,
  loadingTitle,
  error,
  errorTitle,
  errorBody,
  children,
}: Props) => {
  return (
    <>
      {!loading && !error ? children : null}
      {error && !loading ? (
        <>
          <EuiSpacer size="xxl" />
          <EuiEmptyPrompt
            iconType="warning"
            color="danger"
            title={<h2>{errorTitle}</h2>}
            body={<p>{errorBody}</p>}
          />
        </>
      ) : null}
      {loading ? (
        <PageLoader icon={<EuiLoadingSpinner size="xxl" />} title={<h3>{loadingTitle}</h3>} />
      ) : null}
    </>
  );
};
