/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import userEvent from '@testing-library/user-event';
import React from 'react';
import { act } from 'react-dom/test-utils';

import { AppMockRenderer, createAppMockRenderer, TestProviders } from '../../common/mock';
import { UtilityBarBulkActions } from './utility_bar_bulk_actions';

describe('UtilityBarBulkActions', () => {
  let appMockRenderer: AppMockRenderer;
  const closePopover = jest.fn();
  const onButtonClick = jest.fn();
  const dataTestSubj = 'test-bar-action';

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  it('renders', () => {
    const res = appMockRenderer.render(
      <TestProviders>
        <UtilityBarBulkActions
          iconType="alert"
          isPopoverOpen={false}
          buttonTitle="button title"
          closePopover={closePopover}
          onButtonClick={onButtonClick}
          dataTestSubj={dataTestSubj}
        >
          {'Test bulk actions'}
        </UtilityBarBulkActions>
      </TestProviders>
    );

    expect(res.getByTestId(dataTestSubj)).toBeInTheDocument();
    expect(res.getByText('button title')).toBeInTheDocument();
  });

  it('renders a popover', async () => {
    const res = appMockRenderer.render(
      <TestProviders>
        <UtilityBarBulkActions
          iconType="alert"
          isPopoverOpen={true}
          buttonTitle="button title"
          closePopover={closePopover}
          onButtonClick={onButtonClick}
          dataTestSubj={dataTestSubj}
        >
          {'Test bulk actions'}
        </UtilityBarBulkActions>
      </TestProviders>
    );

    expect(res.getByText('Test bulk actions')).toBeInTheDocument();
  });

  it('calls onButtonClick', async () => {
    const res = appMockRenderer.render(
      <TestProviders>
        <UtilityBarBulkActions
          iconType="alert"
          isPopoverOpen={true}
          buttonTitle="button title"
          closePopover={closePopover}
          onButtonClick={onButtonClick}
          dataTestSubj={dataTestSubj}
        >
          {'Test bulk actions'}
        </UtilityBarBulkActions>
      </TestProviders>
    );

    expect(res.getByText('Test bulk actions')).toBeInTheDocument();

    act(() => {
      userEvent.click(res.getByText('button title'));
    });

    expect(onButtonClick).toHaveBeenCalled();
  });
});
