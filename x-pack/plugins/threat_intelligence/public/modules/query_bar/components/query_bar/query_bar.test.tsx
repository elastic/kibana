/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { QueryBar } from './query_bar';
import userEvent from '@testing-library/user-event';

import { FilterManager } from '@kbn/data-plugin/public';

import { coreMock } from '@kbn/core/public/mocks';
import { TestProvidersComponent } from '../../../../common/mocks/test_providers';
import { getByTestSubj } from '../../../../../common/test/utils';

const mockUiSettingsForFilterManager = coreMock.createStart().uiSettings;

const filterManager = new FilterManager(mockUiSettingsForFilterManager);

describe('QueryBar ', () => {
  const onSubmitQuery = jest.fn();
  const onSubmitDateRange = jest.fn();
  const onSavedQuery = jest.fn();
  const onChangedQuery = jest.fn();

  beforeEach(async () => {
    await act(async () => {
      render(
        <TestProvidersComponent>
          <QueryBar
            filterQuery={{ query: '', language: 'kuery' }}
            indexPattern={{ fields: [] } as any}
            filterManager={filterManager}
            filters={[]}
            onRefresh={jest.fn()}
            onSubmitQuery={onSubmitQuery}
            onChangedQuery={onChangedQuery}
            onSubmitDateRange={onSubmitDateRange}
            onSavedQuery={onSavedQuery}
          />
        </TestProvidersComponent>
      );
    });

    // Some parts of this are lazy loaded, we need to wait for quert input to appear before tests can be done
    await waitFor(() => screen.queryByRole('input'));
  });

  it('should call onSubmitDateRange when date range is changed', async () => {
    expect(getByTestSubj('superDatePickerToggleQuickMenuButton')).toBeInTheDocument();

    await act(async () => {
      userEvent.click(getByTestSubj('superDatePickerToggleQuickMenuButton'));
    });

    await act(async () => {
      screen.getByText('Apply').click();
    });

    expect(onSubmitDateRange).toHaveBeenCalled();
  });

  it('should call onSubmitQuery when query is changed', async () => {
    const queryInput = getByTestSubj('queryInput');

    await act(async () => {
      userEvent.type(queryInput, 'one_serious_query');
    });

    expect(onChangedQuery).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'kuery', query: expect.any(String) })
    );

    await act(async () => {
      screen.getByText('Refresh').click();
    });

    expect(onSubmitQuery).toHaveBeenCalled();
  });
});
