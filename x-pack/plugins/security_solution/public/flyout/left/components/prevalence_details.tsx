/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { PREVALENCE_DETAILS_TEST_ID } from './test_ids';

export const PREVALENCE_TAB_ID = 'prevalence-details';

/**
 * Prevalence displayed in the document details expandable flyout left section under the Insights tab
 */
export const PrevalenceDetails: React.FC = () => {
  return <EuiText data-test-subj={PREVALENCE_DETAILS_TEST_ID}>{'Prevalence'}</EuiText>;
};

PrevalenceDetails.displayName = 'PrevalenceDetails';
