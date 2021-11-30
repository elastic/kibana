/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { HostRiskSeverity } from '../../../../common/search_strategy';
import { TestProviders } from '../../../common/mock';
import { HostRiskScore } from './host_risk_score';

describe('HostRiskScore', () => {
  it('renders', () => {
    const { container } = render(
      <TestProviders>
        <HostRiskScore severity={HostRiskSeverity.high} />
      </TestProviders>
    );
    expect(container).toHaveTextContent(HostRiskSeverity.high);
  });
});
