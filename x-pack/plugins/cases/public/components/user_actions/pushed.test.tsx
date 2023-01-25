/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { render, screen } from '@testing-library/react';

import { Actions, NONE_CONNECTOR_ID } from '../../../common/api';
import { getUserAction } from '../../containers/mock';
import { TestProviders } from '../../common/mock';
import { createPushedUserActionBuilder } from './pushed';
import { getMockBuilderArgs } from './mock';
import { getCaseConnectorsMockResponse } from '../../common/mock/connectors';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

describe('createPushedUserActionBuilder ', () => {
  const builderArgs = getMockBuilderArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly pushing for the first time', async () => {
    const userAction = getUserAction('pushed', Actions.push_to_service);
    const builder = createPushedUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('pushed as new incident connector name')).toBeInTheDocument();
    expect(screen.getByText('external title').closest('a')).toHaveAttribute(
      'href',
      'basicPush.com'
    );
  });

  it('renders correctly when updating an external service', async () => {
    const userAction = getUserAction('pushed', Actions.push_to_service);
    const caseConnectors = getCaseConnectorsMockResponse({
      'servicenow-1': { oldestPushDate: '2023-01-16T09:46:29.813Z' },
    });
    const builder = createPushedUserActionBuilder({
      ...builderArgs,
      caseConnectors,
      userAction,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('updated incident connector name')).toBeInTheDocument();
  });

  it('shows only the top footer if it is the latest push and there is nothing to push', async () => {
    const userAction = getUserAction('pushed', Actions.push_to_service, {
      createdAt: '2023-01-17T09:46:29.813Z',
    });

    const builder = createPushedUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('Already pushed to My SN connector incident')).toBeInTheDocument();
    expect(
      screen.queryByText('Requires update to My SN connector incident')
    ).not.toBeInTheDocument();
  });

  it('shows both footers if the connectors needs to be pushed and is the latest push', async () => {
    const caseConnectors = getCaseConnectorsMockResponse({
      'servicenow-1': { needsToBePushed: true },
    });
    const userAction = getUserAction('pushed', Actions.push_to_service, {
      createdAt: '2023-01-17T09:46:29.813Z',
    });
    const builder = createPushedUserActionBuilder({
      ...builderArgs,
      caseConnectors,
      userAction,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('Already pushed to My SN connector incident')).toBeInTheDocument();
    expect(screen.getByText('Requires update to My SN connector incident')).toBeInTheDocument();
  });

  it('does not show the footers if it is not the latest push', async () => {
    const userAction = getUserAction('pushed', Actions.push_to_service, {
      createdAt: '2020-01-17T09:46:29.813Z',
    });

    const builder = createPushedUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(
      screen.queryByText('Already pushed to My SN connector incident')
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText('Requires update to My SN connector incident')
    ).not.toBeInTheDocument();
  });

  it('does not show the push information if the connector is none', async () => {
    const caseConnectors = getCaseConnectorsMockResponse({
      'servicenow-1': { needsToBePushed: true },
    });
    const userAction = getUserAction('pushed', Actions.push_to_service, {
      createdAt: '2023-01-17T09:46:29.813Z',
      payload: {
        externalService: { connectorId: NONE_CONNECTOR_ID, connectorName: 'none connector' },
      },
    });

    const builder = createPushedUserActionBuilder({
      ...builderArgs,
      caseConnectors,
      userAction,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.queryByText('pushed as new incident none connector')).not.toBeInTheDocument();
    expect(screen.queryByText('updated incident none connector')).not.toBeInTheDocument();
    expect(screen.queryByText('Already pushed to connector name incident')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Requires update to connector name incident')
    ).not.toBeInTheDocument();
  });
});
