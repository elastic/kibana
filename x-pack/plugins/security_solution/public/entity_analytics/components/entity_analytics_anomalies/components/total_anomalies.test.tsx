/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AnomalyEntity } from '../../../../common/components/ml/anomaly/use_anomalies_search';
import type { SecurityJob } from '../../../../common/components/ml_popover/types';
import { render } from '@testing-library/react';
import { TotalAnomalies } from './total_anomalies';
import { TestProviders } from '../../../../common/mock';

const defaultProps = {
  count: 0,
  job: { isInstalled: true, datafeedState: 'started', jobState: 'opened' } as SecurityJob,
  entity: AnomalyEntity.User,
  recentlyEnabledJobIds: [],
  loading: false,
  onJobEnabled: () => {},
};

describe('TotalAnomalies', () => {
  it('shows a waiting status when the job is loading', () => {
    const loadingJob = {
      isInstalled: false,
      datafeedState: 'starting',
      jobState: 'opening',
    } as SecurityJob;

    const { container } = render(<TotalAnomalies {...{ ...defaultProps, job: loadingJob }} />, {
      wrapper: TestProviders,
    });

    expect(container).toHaveTextContent('Waiting');
  });
});
