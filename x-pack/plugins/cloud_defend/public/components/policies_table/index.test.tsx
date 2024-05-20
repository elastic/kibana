/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import Chance from 'chance';
import { render, screen } from '@testing-library/react';
import moment from 'moment';
import { createCloudDefendIntegrationFixture } from '../../test/fixtures/cloud_defend_integration';
import { PoliciesTable } from '.';
import { TestProvider } from '../../test/test_provider';

describe('<PoliciesTable />', () => {
  const chance = new Chance();

  const tableProps = {
    pageIndex: 1,
    pageSize: 10,
    error: undefined,
    loading: false,
    setQuery: jest.fn(),
  };

  it('renders integration name', () => {
    const item = createCloudDefendIntegrationFixture();
    const policies = [item];

    render(
      <TestProvider>
        <PoliciesTable
          {...{
            ...tableProps,
            policies,
            totalItemCount: policies.length,
          }}
        />
      </TestProvider>
    );

    expect(screen.getByText(item.package_policy.name)).toBeInTheDocument();
  });

  it('renders agent policy name', () => {
    const agentPolicy = {
      id: chance.guid(),
      name: chance.sentence(),
      agents: chance.integer({ min: 1 }),
    };

    const policies = [createCloudDefendIntegrationFixture({ agent_policy: agentPolicy })];

    render(
      <TestProvider>
        <PoliciesTable
          {...{
            ...tableProps,
            policies,
            totalItemCount: policies.length,
          }}
        />
      </TestProvider>
    );

    expect(screen.getByText(agentPolicy.name)).toBeInTheDocument();
  });

  it('renders number of agents', () => {
    const item = createCloudDefendIntegrationFixture();
    const policies = [item];

    render(
      <TestProvider>
        <PoliciesTable
          {...{
            ...tableProps,
            policies,
            totalItemCount: policies.length,
          }}
        />
      </TestProvider>
    );

    // TODO too loose
    expect(screen.getByText(item.agent_policy.agents as number)).toBeInTheDocument();
  });

  it('renders created by', () => {
    const item = createCloudDefendIntegrationFixture();
    const policies = [item];

    render(
      <TestProvider>
        <PoliciesTable
          {...{
            ...tableProps,
            policies,
            totalItemCount: policies.length,
          }}
        />
      </TestProvider>
    );

    expect(screen.getByText(item.package_policy.created_by)).toBeInTheDocument();
  });

  it('renders created at', () => {
    const item = createCloudDefendIntegrationFixture();
    const policies = [item];

    render(
      <TestProvider>
        <PoliciesTable
          {...{
            ...tableProps,
            policies,
            totalItemCount: policies.length,
          }}
        />
      </TestProvider>
    );

    expect(screen.getByText(moment(item.package_policy.created_at).fromNow())).toBeInTheDocument();
  });
});
