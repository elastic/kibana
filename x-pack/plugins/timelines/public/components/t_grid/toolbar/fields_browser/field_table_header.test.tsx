/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../mock';
import { FieldTableHeader, FieldTableHeaderProps } from './field_table_header';

const mockOnFilterSelectedChange = jest.fn();
const defaultProps: FieldTableHeaderProps = {
  fieldCount: 0,
  filterSelectedEnabled: false,
  onFilterSelectedChange: mockOnFilterSelectedChange,
};

describe('FieldTableHeader', () => {
  describe('FieldCount', () => {
    it('should render empty field table', () => {
      const result = render(
        <TestProviders>
          <FieldTableHeader {...defaultProps} />
        </TestProviders>
      );

      expect(result.getByTestId('fields-showing').textContent).toBe('Showing 0 fields');
    });

    it('should render field table with one singular field count value', () => {
      const result = render(
        <TestProviders>
          <FieldTableHeader {...defaultProps} fieldCount={1} />
        </TestProviders>
      );

      expect(result.getByTestId('fields-showing').textContent).toBe('Showing 1 field');
    });
    it('should render field table with multiple fields count value', () => {
      const result = render(
        <TestProviders>
          <FieldTableHeader {...defaultProps} fieldCount={4} />
        </TestProviders>
      );

      expect(result.getByTestId('fields-showing').textContent).toBe('Showing 4 fields');
    });
  });

  describe('View selected', () => {
    beforeEach(() => {
      mockOnFilterSelectedChange.mockClear();
    });

    it('should render "view all" option when filterSelected is not enabled', () => {
      const result = render(
        <TestProviders>
          <FieldTableHeader {...defaultProps} filterSelectedEnabled={false} />
        </TestProviders>
      );

      expect(result.getByTestId('viewSelectorButton').textContent).toBe('View: all');
    });

    it('should render "view selected" option when filterSelected is not enabled', () => {
      const result = render(
        <TestProviders>
          <FieldTableHeader {...defaultProps} filterSelectedEnabled={true} />
        </TestProviders>
      );

      expect(result.getByTestId('viewSelectorButton').textContent).toBe('View: selected');
    });

    it('should open the view selector with button click', async () => {
      const result = render(
        <TestProviders>
          <FieldTableHeader {...defaultProps} />
        </TestProviders>
      );

      expect(result.queryByTestId('viewSelectorMenu')).toBeNull();
      expect(result.queryByTestId('viewSelectorOption-all')).toBeNull();
      expect(result.queryByTestId('viewSelectorOption-selected')).toBeNull();

      result.getByTestId('viewSelectorButton').click();

      expect(result.getByTestId('viewSelectorMenu')).toBeInTheDocument();
      expect(result.getByTestId('viewSelectorOption-all')).toBeInTheDocument();
      expect(result.getByTestId('viewSelectorOption-selected')).toBeInTheDocument();
    });

    it('should callback when "view all" option is clicked', () => {
      const result = render(
        <TestProviders>
          <FieldTableHeader {...defaultProps} filterSelectedEnabled={false} />
        </TestProviders>
      );

      result.getByTestId('viewSelectorButton').click();
      result.getByTestId('viewSelectorOption-all').click();
      expect(mockOnFilterSelectedChange).toHaveBeenCalledWith(false);
    });

    it('should callback when "view selected" option is clicked', () => {
      const result = render(
        <TestProviders>
          <FieldTableHeader {...defaultProps} filterSelectedEnabled={false} />
        </TestProviders>
      );

      result.getByTestId('viewSelectorButton').click();
      result.getByTestId('viewSelectorOption-selected').click();
      expect(mockOnFilterSelectedChange).toHaveBeenCalledWith(true);
    });
  });
});
