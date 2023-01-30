/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { AllCasesSelectorModal } from '.';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import userEvent from '@testing-library/user-event';
import { act, waitFor } from '@testing-library/react';

jest.mock('../../../containers/api');
jest.mock('../../../containers/user_profiles/api');

const onRowClick = jest.fn();
const defaultProps = {
  onRowClick,
};

describe('AllCasesSelectorModal', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  it('renders', () => {
    const res = appMockRenderer.render(<AllCasesSelectorModal {...defaultProps} />);

    expect(res.getByTestId('all-cases-modal')).toBeInTheDocument();
  });

  it('Closing modal when pressing the x icon', () => {
    const res = appMockRenderer.render(<AllCasesSelectorModal {...defaultProps} />);

    act(() => {
      userEvent.click(res.getByLabelText('Closes this modal window'));
    });

    expect(res.queryByTestId('all-cases-modal')).toBeFalsy();
  });

  it('Closing modal when pressing the cancel button', () => {
    const res = appMockRenderer.render(<AllCasesSelectorModal {...defaultProps} />);

    act(() => {
      userEvent.click(res.getByTestId('all-cases-modal-cancel-button'));
    });

    expect(res.queryByTestId('all-cases-modal')).toBeFalsy();
  });

  it('should not show bulk actions and row actions on the modal', async () => {
    const res = appMockRenderer.render(<AllCasesSelectorModal {...defaultProps} />);
    await waitFor(() => {
      expect(res.getByTestId('cases-table')).toBeInTheDocument();
    });

    expect(res.queryByTestId('case-table-bulk-actions-link-icon')).toBeFalsy();
    expect(res.queryByText('Actions')).toBeFalsy();
  });

  it('should show the select button', async () => {
    const res = appMockRenderer.render(<AllCasesSelectorModal {...defaultProps} />);
    await waitFor(() => {
      expect(res.getByTestId('cases-table')).toBeInTheDocument();
    });

    expect(res.getAllByTestId(/cases-table-row-select/).length).toBeGreaterThan(0);
  });

  it('should hide the metrics', async () => {
    const res = appMockRenderer.render(<AllCasesSelectorModal {...defaultProps} />);
    await waitFor(() => {
      expect(res.getByTestId('cases-table')).toBeInTheDocument();
    });

    expect(res.queryByTestId('cases-metrics-stats')).toBeFalsy();
  });
});
