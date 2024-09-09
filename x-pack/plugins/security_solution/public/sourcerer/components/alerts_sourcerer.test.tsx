/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Sourcerer } from '.';
import { sourcererModel } from '../store';
import { TestProviders } from '../../common/mock';
import { useSourcererDataView } from '../containers';
import { useSignalHelpers } from '../containers/use_signal_helpers';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockDispatch = jest.fn();

jest.mock('../containers');
jest.mock('../containers/use_signal_helpers');
const mockUseUpdateDataView = jest.fn().mockReturnValue(() => true);
jest.mock('./use_update_data_view', () => ({
  useUpdateDataView: () => mockUseUpdateDataView,
}));
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

jest.mock('@kbn/react-kibana-mount', () => {
  const original = jest.requireActual('@kbn/react-kibana-mount');

  return {
    ...original,
    toMountPoint: jest.fn(),
  };
});

const mockUpdateUrlParam = jest.fn();
jest.mock('../../common/utils/global_query_string', () => {
  const original = jest.requireActual('../../common/utils/global_query_string');

  return {
    ...original,
    useUpdateUrlParam: () => mockUpdateUrlParam,
  };
});

const sourcererDataView = {
  indicesExist: true,
  loading: false,
};
describe('sourcerer on alerts page or rules details page', () => {
  const testProps = {
    scope: sourcererModel.SourcererScopeName.detections,
  };

  const pollForSignalIndexMock = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    (useSignalHelpers as jest.Mock).mockReturnValue({
      pollForSignalIndex: pollForSignalIndexMock,
      signalIndexNeedsInit: false,
    });

    (useSourcererDataView as jest.Mock).mockReturnValue({
      ...sourcererDataView,
      indicesExist: true,
    });

    render(
      <TestProviders>
        <Sourcerer {...testProps} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('sourcerer-trigger'));
    await waitFor(() => {
      expect(screen.getByTestId('sourcerer-advanced-options-toggle')).toBeVisible();
    });
    fireEvent.click(screen.getByTestId('sourcerer-advanced-options-toggle'));
  });

  it('renders an alerts badge in sourcerer button', () => {
    expect(screen.getByTestId('sourcerer-advanced-options-toggle')).toHaveTextContent(
      /Advanced options/
    );
  });

  it('renders a callout', () => {
    expect(screen.getByTestId('sourcerer-callout')).toHaveTextContent(
      'Data view cannot be modified on this page'
    );
  });

  it('disable data view selector', () => {
    expect(screen.getByTestId('sourcerer-select')).toBeDisabled();
  });

  it('data view selector is default to Security Data View', () => {
    expect(screen.getByTestId('sourcerer-select')).toHaveTextContent(/security data view/i);
  });

  it('renders an alert badge in data view selector', () => {
    expect(screen.getByTestId('security-alerts-option-badge')).toHaveTextContent('Alerts');
  });

  it('disable index pattern selector', () => {
    expect(screen.getByTestId('sourcerer-combo-box')).toHaveAttribute('disabled');
  });

  it('shows signal index as index pattern option', () => {
    expect(screen.getByTestId('euiComboBoxPill')).toHaveTextContent('.siem-signals-spacename');
  });

  it('does not render reset button', () => {
    expect(screen.queryByTestId('sourcerer-reset')).toBeFalsy();
  });

  it('does not render save button', () => {
    expect(screen.queryByTestId('sourcerer-save')).toBeFalsy();
  });
});
