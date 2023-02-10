/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';

export interface Props {
  slo: SLOWithSummaryResponse | undefined;
  isLoading: boolean;
}

export function PageTitle(props: Props) {
  const { isLoading, slo } = props;
  if (isLoading) {
    return <EuiLoadingSpinner data-test-subj="loadingTitle" />;
  }

  return <>{slo && slo.name}</>;
}
