/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCommentList } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { UserActionActions } from '../../../common/types/domain';
import { TestProviders } from '../../common/mock';
import { getUserAction } from '../../containers/mock';
import { getMockBuilderArgs } from './mock';
import { createTitleUserActionBuilder } from './title';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

describe('createTitleUserActionBuilder ', () => {
  const builderArgs = getMockBuilderArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const userAction = getUserAction('title', UserActionActions.update);
    // @ts-ignore no need to pass all the arguments
    const builder = createTitleUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText(`changed case name to "a title"`)).toBeInTheDocument();
  });
});
