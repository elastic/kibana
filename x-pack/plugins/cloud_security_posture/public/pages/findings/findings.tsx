/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import type { EuiPageHeaderProps } from '@elastic/eui';
import { FindingsTableContainer } from './findings_container';
import { CspPageTemplate } from '../../components/page_template';
import { useKubebeatDataView } from './utils';
import { TEST_SUBJECTS } from './constants';

const pageHeader: EuiPageHeaderProps = {
  pageTitle: 'Findings',
};

export const Findings = () => {
  const dataView = useKubebeatDataView();

  return (
    <CspPageTemplate pageHeader={pageHeader}>
      {dataView.status === 'loading' && <LoadingPrompt />}
      {(dataView.status === 'error' || (dataView.status !== 'loading' && !dataView.data)) && (
        <ErrorPrompt />
      )}
      {dataView.status === 'success' && dataView.data && (
        <FindingsTableContainer dataView={dataView.data} />
      )}
    </CspPageTemplate>
  );
};

const LoadingPrompt = () => <EuiEmptyPrompt icon={<EuiLoadingSpinner size="xl" />} />;

// TODO: follow https://elastic.github.io/eui/#/display/empty-prompt/guidelines
const ErrorPrompt = () => (
  <EuiEmptyPrompt
    data-test-subj={TEST_SUBJECTS.FINDINGS_MISSING_INDEX}
    color="danger"
    iconType="alert"
    // TODO: account for when we have a dataview without an index
    title={<h2>Kubebeat DataView is missing</h2>}
  />
);
