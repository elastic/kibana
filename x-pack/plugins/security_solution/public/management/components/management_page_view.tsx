/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiErrorBoundary } from '@elastic/eui';
import { PageView, PageViewProps } from '../../common/components/endpoint/page_view';

export const ManagementPageView = memo<Omit<PageViewProps, 'tabs'>>((options) => {
  return (
    <EuiErrorBoundary>
      <PageView {...options} />
    </EuiErrorBoundary>
  );
});

ManagementPageView.displayName = 'ManagementPageView';
