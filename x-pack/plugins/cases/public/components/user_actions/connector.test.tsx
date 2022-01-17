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
import { getUserAction, getJiraConnector } from '../../containers/mock';
import { TestProviders } from '../../common/mock';
import { createConnectorUserActionBuilder } from './connector';
import { getMockBuilderArgs } from './mock';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

describe('createConnectorUserActionBuilder ', () => {
  const builderArgs = getMockBuilderArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const userAction = getUserAction('connector', Actions.update, {
      payload: { connector: getJiraConnector() },
    });

    const builder = createConnectorUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('selected jira1 as incident management system')).toBeInTheDocument();
  });

  it('renders the removed connector label if the connector is none', async () => {
    const userAction = getUserAction('connector', Actions.update, {
      payload: { connector: { ...getJiraConnector(), id: NONE_CONNECTOR_ID } },
    });

    const builder = createConnectorUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('removed external incident management system')).toBeInTheDocument();
  });
});
