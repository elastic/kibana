/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import userEvent from '@testing-library/user-event';
import React from 'react';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { EditObservableModal, type EditObservableModalProps } from './edit_observable_modal';
import { type ObservableFormProps } from './observable_form';
import type { ObservablePatch } from '../../../common/types/api/observable/v1';

jest.mock('./observable_form', () => ({
  ObservableForm: (props: ObservableFormProps) => (
    <>
      <button type="button" onClick={() => props.onSubmit({} as ObservablePatch)}>
        {'Save observable'}
      </button>
      <button type="button" onClick={props.onCancel}>
        {'Cancel'}
      </button>
    </>
  ),
}));

describe('EditObservableModal', () => {
  let appMock: AppMockRenderer;
  const props: EditObservableModalProps = {
    isLoading: false,
    closeModal: jest.fn(),
    observable: {
      value: '',
      typeKey: '67ac7899-2cc0-4ce5-80d3-0f4a2d2af33e',
      id: '84279197-3746-47fb-ba4d-c7946a7feb88',
      createdAt: '2024-10-01',
      updatedAt: '2024-10-01',
      description: '',
    },
    handleUpdateObservable: jest.fn(),
  };

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const result = appMock.render(<EditObservableModal {...props} />);

    expect(result.getByTestId('case-observables-edit-modal')).toBeInTheDocument();
    expect(result.getByText('Save observable')).toBeInTheDocument();
  });

  it('calls handleUpdateObservable', async () => {
    const result = appMock.render(<EditObservableModal {...props} />);

    expect(result.getByText('Save observable')).toBeInTheDocument();
    await userEvent.click(result.getByText('Save observable'));

    expect(props.handleUpdateObservable).toHaveBeenCalled();
  });

  it('calls onCancel', async () => {
    const result = appMock.render(<EditObservableModal {...props} />);

    expect(result.getByText('Cancel')).toBeInTheDocument();
    await userEvent.click(result.getByText('Cancel'));

    expect(props.closeModal).toHaveBeenCalled();
  });
});
