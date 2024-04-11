/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import {
  AssetCriticalityValidationStep,
  type AssetCriticalityValidationStepProps,
} from './validation_step';
import { TestProviders } from '../../../../common/mock';

import { downloadBlob } from '../../../../common/utils/download_blob';

jest.mock('../../../../common/utils/download_blob');

jest.mock('../../../../common/lib/kibana/kibana_react', () => ({
  useKibana: () => ({
    services: {
      telemetry: {
        reportAssetCriticalityCsvImported: jest.fn(),
      },
    },
  }),
}));

describe('AssetCriticalityValidationStep', () => {
  const mockOnConfirm = jest.fn();
  const mockOnReturn = jest.fn();

  const defaultProps: AssetCriticalityValidationStepProps = {
    validLinesCount: 10,
    invalidLinesCount: 5,
    validLinesAsText: 'Valid lines as text',
    invalidLinesAsText: 'Invalid lines as text',
    fileName: 'test.csv',
    fileSize: 100,
    onConfirm: mockOnConfirm,
    onReturn: mockOnReturn,
    invalidLinesErrors: [],
  };

  it('renders the component with correct counts and file name', () => {
    const { container } = render(<AssetCriticalityValidationStep {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(container).toHaveTextContent('10 asset criticalities will be assigned');
    expect(container).toHaveTextContent("5 lines are invalid and won't be assigned");
    expect(container).toHaveTextContent('test.csv preview');
  });

  it('calls onConfirm when assign button is clicked', () => {
    const { getByText } = render(<AssetCriticalityValidationStep {...defaultProps} />, {
      wrapper: TestProviders,
    });
    const confirmButton = getByText('Assign');
    fireEvent.click(confirmButton);
    expect(mockOnConfirm).toHaveBeenCalled();
  });

  it('calls onReturn when "back" button is clicked', () => {
    const { getByText } = render(<AssetCriticalityValidationStep {...defaultProps} />, {
      wrapper: TestProviders,
    });
    const returnButton = getByText('Back');
    fireEvent.click(returnButton);
    expect(mockOnReturn).toHaveBeenCalled();
  });

  it('calls onReturn when "choose another file" button is clicked', () => {
    const { getByText } = render(<AssetCriticalityValidationStep {...defaultProps} />, {
      wrapper: TestProviders,
    });
    const returnButton = getByText('Choose another file');
    fireEvent.click(returnButton);
    expect(mockOnReturn).toHaveBeenCalled();
  });

  it('downloads the invalid lines as text when Download CSV is clicked', () => {
    const { getByText } = render(<AssetCriticalityValidationStep {...defaultProps} />, {
      wrapper: TestProviders,
    });
    const downloadButton = getByText('Download CSV');
    fireEvent.click(downloadButton);
    expect(downloadBlob).toHaveBeenCalledWith(
      new Blob(['Invalid lines as text']),
      'invalid_asset_criticality.csv'
    );
  });
});
