/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { LOADING_PAGE_MESSAGE } from '../translations';

export const AlertDetailsLoadingPage = memo(({ eventId }: { eventId: string }) => (
  <EuiEmptyPrompt
    data-test-subj="alert-details-page-loading"
    color="subdued"
    icon={<EuiLoadingSpinner data-test-subj="loading-spinner" size="l" />}
    body={<p>{LOADING_PAGE_MESSAGE}</p>}
  />
));

AlertDetailsLoadingPage.displayName = 'AlertDetailsLoadingPage';
