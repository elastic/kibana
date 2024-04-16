/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import React from 'react';
import { dnsStatItems, NetworkKpiDns } from '.';
import { KpiBaseComponent } from '../../../../components/kpi';

jest.mock('../../../../components/kpi');

describe('DNS KPI', () => {
  const from = new Date('2023-12-30').toISOString();
  const to = new Date('2023-12-31').toISOString();
  const MockKpiBaseComponent = KpiBaseComponent as unknown as jest.Mock;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<NetworkKpiDns from={from} to={to} />, {
      wrapper: TestProviders,
    });
    expect(MockKpiBaseComponent.mock.calls[0][0].statItems).toEqual(dnsStatItems);
    expect(MockKpiBaseComponent.mock.calls[0][0].from).toEqual(from);
    expect(MockKpiBaseComponent.mock.calls[0][0].to).toEqual(to);
  });
});
