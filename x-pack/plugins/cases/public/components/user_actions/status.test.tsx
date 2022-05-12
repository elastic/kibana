/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { render, screen } from '@testing-library/react';

import { Actions, CaseStatuses } from '../../../common/api';
import { getUserAction } from '../../containers/mock';
import { TestProviders } from '../../common/mock';
import { createStatusUserActionBuilder } from './status';
import { getMockBuilderArgs } from './mock';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

describe('createStatusUserActionBuilder ', () => {
  const builderArgs = getMockBuilderArgs();
  const tests = [
    [CaseStatuses.open, 'Open'],
    [CaseStatuses['in-progress'], 'In progress'],
    [CaseStatuses.closed, 'Closed'],
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(tests)('renders correctly when changed to %s status', async (status, label) => {
    const userAction = getUserAction('status', Actions.update, { payload: { status } });
    const builder = createStatusUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('marked case as')).toBeInTheDocument();
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
