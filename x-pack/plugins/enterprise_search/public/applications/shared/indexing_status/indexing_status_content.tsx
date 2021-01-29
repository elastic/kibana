/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiProgress, EuiSpacer, EuiTitle } from '@elastic/eui';

import { INDEXING_STATUS_PROGRESS_TITLE } from './constants';

interface IIndexingStatusContentProps {
  percentageComplete: number;
}

export const IndexingStatusContent: React.FC<IIndexingStatusContentProps> = ({
  percentageComplete,
}) => (
  <div data-test-subj="IndexingStatusProgressMeter">
    <EuiTitle size="s">
      <h3>{INDEXING_STATUS_PROGRESS_TITLE}</h3>
    </EuiTitle>
    <EuiSpacer size="s" />
    <EuiProgress color="primary" size="m" value={percentageComplete} max={100} />
  </div>
);
