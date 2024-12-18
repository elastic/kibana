/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { SelectIndicesFlyout } from './select_indices_flyout';
import { useSourceIndicesFields } from '../hooks/use_source_indices_field';
import { useQueryIndices } from '../hooks/use_query_indices';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

jest.mock('../hooks/use_source_indices_field');
jest.mock('../hooks/use_query_indices');
jest.mock('../hooks/use_indices_fields', () => ({
  useIndicesFields: () => ({ fields: {} }),
}));

const Wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => {
  return (
    <>
      <IntlProvider locale="en">{children}</IntlProvider>
    </>
  );
};

const mockedUseSourceIndicesFields = useSourceIndicesFields as jest.MockedFunction<
  typeof useSourceIndicesFields
>;
const mockedUseQueryIndices = useQueryIndices as jest.MockedFunction<typeof useQueryIndices>;

describe('SelectIndicesFlyout', () => {
  const onCloseMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseSourceIndicesFields.mockReturnValue({
      indices: ['index1', 'index2'],
      setIndices: jest.fn(),
      fields: {},
      addIndex: () => {},
      removeIndex: () => {},
      isFieldsLoading: false,
    });

    mockedUseQueryIndices.mockReturnValue({
      indices: ['index1', 'index2', 'index3'],
      isLoading: false,
      isFetched: true,
    });
  });

  it('renders correctly', () => {
    const { getByTestId } = render(<SelectIndicesFlyout onClose={onCloseMock} />, {
      wrapper: Wrapper,
    });

    expect(getByTestId('indicesTable')).toBeInTheDocument();
    expect(getByTestId('saveButton')).toBeInTheDocument();
    expect(getByTestId('closeButton')).toBeInTheDocument();
  });

  it('selecting indices and saving', async () => {
    const { getByTestId } = render(<SelectIndicesFlyout onClose={onCloseMock} />, {
      wrapper: Wrapper,
    });

    fireEvent.click(getByTestId('sourceIndex-2'));
    fireEvent.click(getByTestId('saveButton'));

    await waitFor(() => {
      expect(mockedUseSourceIndicesFields().setIndices).toHaveBeenCalledWith([
        'index1',
        'index2',
        'index3',
      ]);
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it('closing flyout without saving', () => {
    const { getByTestId } = render(<SelectIndicesFlyout onClose={onCloseMock} />, {
      wrapper: Wrapper,
    });

    fireEvent.click(getByTestId('closeButton'));

    expect(onCloseMock).toHaveBeenCalled();
  });

  it('save button is disabled when no indices are selected', () => {
    mockedUseSourceIndicesFields.mockReturnValueOnce({
      indices: [],
      setIndices: jest.fn(),
      fields: {},
      addIndex: () => {},
      removeIndex: () => {},
      isFieldsLoading: false,
    });

    const { getByTestId } = render(<SelectIndicesFlyout onClose={onCloseMock} />, {
      wrapper: Wrapper,
    });

    const saveButton = getByTestId('saveButton');
    expect(saveButton).toBeDisabled();
  });
});
