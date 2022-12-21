/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import userEvent from '@testing-library/user-event';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { UserActionPropertyActions } from './property_actions';

describe('UserActionPropertyActions', () => {
  let appMock: AppMockRenderer;
  const onClick = jest.fn();

  const props = {
    isLoading: false,
    propertyActions: [
      {
        iconType: 'pencil',
        label: 'Edit',
        onClick,
      },
    ],
  };

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders the loading spinner correctly when loading', async () => {
    const result = appMock.render(<UserActionPropertyActions {...props} isLoading={true} />);

    expect(result.getByTestId('user-action-title-loading')).toBeInTheDocument();
    expect(result.queryByTestId('property-actions')).not.toBeInTheDocument();
  });

  it('renders the property actions', async () => {
    const result = appMock.render(<UserActionPropertyActions {...props} isLoading={false} />);

    expect(result.getByTestId('property-actions')).toBeInTheDocument();

    userEvent.click(result.getByTestId('property-actions-ellipses'));
    await waitForEuiPopoverOpen();

    expect(result.getByTestId('property-actions-group').children.length).toBe(1);
    expect(result.queryByTestId('property-actions-pencil')).toBeInTheDocument();
  });

  it('does not render if properties are empty', async () => {
    const result = appMock.render(
      <UserActionPropertyActions {...props} isLoading={false} propertyActions={[]} />
    );

    expect(result.queryByTestId('property-actions')).not.toBeInTheDocument();
    expect(result.queryByTestId('user-action-title-loading')).not.toBeInTheDocument();
  });
});
