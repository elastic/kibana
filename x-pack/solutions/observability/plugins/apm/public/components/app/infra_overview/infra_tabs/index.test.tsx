/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import React from 'react';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { renderWithContext } from '../../../../utils/test_helpers';
import { InfraTabs } from '.';
import { useInfrastructureAttributes } from '../use_infrastructure_attributes';
import { useTabs } from './use_tabs';

jest.mock('../use_infrastructure_attributes', () => ({
  useInfrastructureAttributes: jest.fn(),
}));

jest.mock('./use_tabs', () => ({
  InfraTab: {
    containers: 'containers',
    pods: 'pods',
    hosts: 'hosts',
  },
  useTabs: jest.fn(),
}));

const mockUseInfrastructureAttributes = useInfrastructureAttributes as jest.Mock;
const mockUseTabs = useTabs as jest.Mock;
const defaultHookValue = {
  agentName: 'nodejs',
  data: {
    containerIds: [],
    hostNames: ['host-1'],
    podNames: [],
  },
  detailTab: undefined,
  end: '2021-10-10T00:15:00.000Z',
  start: '2021-10-10T00:00:00.000Z',
  status: FETCH_STATUS.SUCCESS,
};

describe('InfraTabs', () => {
  beforeEach(() => {
    mockUseInfrastructureAttributes.mockReturnValue(defaultHookValue);
    mockUseTabs.mockReturnValue([
      {
        content: <div>Host metrics table</div>,
        id: 'hosts',
        name: 'Hosts',
      },
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows infrastructure tab content when data exists', () => {
    renderWithContext(<InfraTabs />);

    expect(screen.getByText('Host metrics table')).toBeInTheDocument();
  });

  it('shows an empty prompt when no infrastructure data exists', () => {
    mockUseInfrastructureAttributes.mockReturnValue({
      ...defaultHookValue,
      data: {
        containerIds: [],
        hostNames: [],
        podNames: [],
      },
    });

    renderWithContext(<InfraTabs />);

    expect(screen.getByTestId('apmInfraTabsEmptyPrompt')).toBeInTheDocument();
  });

  it('shows a failure prompt when loading infrastructure data fails', () => {
    mockUseInfrastructureAttributes.mockReturnValue({
      ...defaultHookValue,
      status: FETCH_STATUS.FAILURE,
    });

    renderWithContext(<InfraTabs />);

    expect(screen.getByText('Unable to load your infrastructure data')).toBeInTheDocument();
  });
});
