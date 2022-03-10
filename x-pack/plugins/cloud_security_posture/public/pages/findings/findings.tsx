/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { EuiPageHeaderProps } from '@elastic/eui';
import { useKubebeatDataView } from '../../common/api/use_kubebeat_data_view';
import { allNavigationItems } from '../../common/navigation/constants';
import { useCspBreadcrumbs } from '../../common/navigation/use_csp_breadcrumbs';
import { FindingsContainer } from './findings_container';
import { CspPageTemplate } from '../../components/page_template';
import { FINDINGS } from './translations';

const pageHeader: EuiPageHeaderProps = {
  pageTitle: FINDINGS,
};

export const Findings = () => {
  const dataView = useKubebeatDataView();
  useCspBreadcrumbs([allNavigationItems.findings]);

  return (
    // `CspPageTemplate` takes care of loading and error states for the kubebeat data view, no need to handle them here
    <CspPageTemplate pageHeader={pageHeader}>
      {dataView.status === 'success' && dataView.data && (
        <FindingsContainer dataView={dataView.data} />
      )}
    </CspPageTemplate>
  );
};
