/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { HeaderPage } from '../../../common/components/header_page';
import { FindingsTableContainer } from './findings_container';

export const Findings = () => (
  <SecuritySolutionPageWrapper noPadding={false} data-test-subj="csp_rules">
    <HeaderPage border title={'Findings'} />
    <FindingsTableContainer />
    {/* TODO: this is needed for sidebar navigation, but requires integrating with Sourcerer */}
    {/* <SpyRoute pageName={CloudPosturePage.findings} /> */}
  </SecuritySolutionPageWrapper>
);
