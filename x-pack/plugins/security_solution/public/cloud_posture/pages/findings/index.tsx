/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { HeaderPage } from '../../../common/components/header_page';
import { useCloudPostureFindingsApi } from '../../common/api';
import { FindingsTable } from './findings_table';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { CloudPosturePage } from '../../../app/types';

export const Findings = () => (
  <SecuritySolutionPageWrapper noPadding={false} data-test-subj="csp_rules">
    <HeaderPage hideSourcerer border title={'Findings'} />
    <EuiSpacer />
    <FindingsTableContainer />
    <SpyRoute pageName={CloudPosturePage.findings} />
  </SecuritySolutionPageWrapper>
);

// Note: we can't use useCloudPostureFindingsApi inside Findings, need to nest it
const FindingsTableContainer = () => {
  const findings = useCloudPostureFindingsApi();

  // TODO: handle states: isSuccess/isError/isLoading
  if (!findings.isSuccess) return <h1>???</h1>;

  const d = findings.data.map((v) => ({ ...v, ...v._source }));

  return <FindingsTable data={d} />;
};
