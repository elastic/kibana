/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { TimelineNonEcsData } from '@kbn/timelines-plugin/common';
import { getFilterForCellAction } from './filter_for';

jest.mock('../kibana');

describe('getFilterForCellAction', () => {
  const sampleData: TimelineNonEcsData = {
    field: 'fizz',
    value: ['buzz'],
  };
  const testComponent = () => <></>;
  const componentProps = {
    colIndex: 1,
    rowIndex: 1,
    columnId: 'fizz',
    Component: testComponent,
    isExpanded: false,
  };
  describe('when data property is', () => {
    test('undefined', () => {
      const CellComponent = getFilterForCellAction({ pageSize: 1, data: undefined });
      const result = render(<CellComponent {...componentProps} />);
      expect(result.container).toBeEmptyDOMElement();
    });

    test('empty', () => {
      const CellComponent = getFilterForCellAction({ pageSize: 1, data: [] });
      const result = render(<CellComponent {...componentProps} />);
      expect(result.container).toBeEmptyDOMElement();
    });
  });

  describe('FilterForCellAction', () => {
    const data: TimelineNonEcsData[][] = [[sampleData]];
    test('should render with data', () => {
      const FilterForCellAction = getFilterForCellAction({ pageSize: 1, data });
      const result = render(<FilterForCellAction {...componentProps} />);
      expect(result.getByTestId('test-filter-for')).toBeInTheDocument();
    });
  });
});
