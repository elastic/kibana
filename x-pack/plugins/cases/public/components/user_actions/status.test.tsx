/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { render, screen } from '@testing-library/react';

import { Actions } from '../../../common/api';
import { getUserAction } from '../../containers/mock';
import { TestProviders } from '../../common/mock';
import { createStatusUserActionBuilder } from './status';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

describe('createStatusUserActionBuilder ', () => {
  const tests = [['Open'], ['In progress'], ['Closed']];
  const handleOutlineComment = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(tests)('renders correctly when changed to %s status', async (status) => {
    const userAction = getUserAction('status', Actions.update);
    // @ts-ignore no need to pass all the arguments
    const builder = createStatusUserActionBuilder({
      userAction,
      handleOutlineComment,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('marked case as')).toBeInTheDocument();
    expect(screen.getByText(status)).toBeInTheDocument();
  });
});
