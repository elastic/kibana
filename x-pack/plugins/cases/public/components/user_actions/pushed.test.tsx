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

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

describe('createPushedUserActionBuilder ', () => {
  const builderArgs = getMockBuilderArgs();
  const caseServices = builderArgs.caseServices;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly pushing for the first time', async () => {
    const userAction = getUserAction('pushed', Actions.push_to_service);
    const builder = createPushedUserActionBuilder({
      ...builderArgs,
      userAction,
      caseServices,
      index: 0,
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
    const builder = createPushedUserActionBuilder({
      ...builderArgs,
      userAction,
      caseServices,
      index: 1,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('updated incident connector name')).toBeInTheDocument();
  });

  it('renders the pushing indicators correctly', async () => {
    const userAction = getUserAction('pushed', Actions.push_to_service);
    const builder = createPushedUserActionBuilder({
      ...builderArgs,
      userAction,
      caseServices: {
        ...caseServices,
        '123': {
          ...caseServices['123'],
          lastPushIndex: 1,
        },
      },
      index: 1,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('Already pushed to connector name incident')).toBeInTheDocument();
    expect(screen.getByText('Requires update to connector name incident')).toBeInTheDocument();
  });

  it('shows only the already pushed indicator if has no data to push', async () => {
    const userAction = getUserAction('pushed', Actions.push_to_service);
    const builder = createPushedUserActionBuilder({
      ...builderArgs,
      userAction,
      caseServices: {
        ...caseServices,
        '123': {
          ...caseServices['123'],
          lastPushIndex: 1,
          hasDataToPush: false,
        },
      },
      index: 1,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('Already pushed to connector name incident')).toBeInTheDocument();
    expect(
      screen.queryByText('Requires update to connector name incident')
    ).not.toBeInTheDocument();
  });

  it('does not show the push information if the connector is none', async () => {
    const userAction = getUserAction('pushed', Actions.push_to_service, {
      payload: {
        externalService: { connectorId: NONE_CONNECTOR_ID, connectorName: 'none connector' },
      },
    });

    const builder = createPushedUserActionBuilder({
      ...builderArgs,
      userAction,
      caseServices: {
        ...caseServices,
        '123': {
          ...caseServices['123'],
          lastPushIndex: 1,
        },
      },
      index: 1,
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
