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
import { CspPageTemplate } from '../../components/csp_page_template';
import { FINDINGS } from './translations';

const pageHeader: EuiPageHeaderProps = {
  pageTitle: FINDINGS,
};

export const Findings = () => {
  const dataViewQuery = useKubebeatDataView();
  useCspBreadcrumbs([allNavigationItems.findings]);

  return (
    <CspPageTemplate pageHeader={pageHeader} query={dataViewQuery}>
      {dataViewQuery.data && <FindingsContainer dataView={dataViewQuery.data} />}
    </CspPageTemplate>
  );
};
