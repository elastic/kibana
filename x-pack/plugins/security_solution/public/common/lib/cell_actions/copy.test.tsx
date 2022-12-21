/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { TimelineNonEcsData } from '@kbn/timelines-plugin/common';
import { getCopyCellAction } from './copy';

jest.mock('../kibana');

describe('getCopyCellAction', () => {
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
      const CellComponent = getCopyCellAction({ pageSize: 1, data: undefined });
      const result = render(<CellComponent {...componentProps} />);
      expect(result.container).toBeEmptyDOMElement();
    });

    test('empty', () => {
      const CellComponent = getCopyCellAction({ pageSize: 1, data: [] });
      const result = render(<CellComponent {...componentProps} />);
      expect(result.container).toBeEmptyDOMElement();
    });
  });

  describe('CopyCellAction', () => {
    const data: TimelineNonEcsData[][] = [[sampleData]];
    test('should render with data', () => {
      const CopyCellAction = getCopyCellAction({ pageSize: 1, data });
      const result = render(<CopyCellAction {...componentProps} />);
      expect(result.getByTestId('test-copy-button')).toBeInTheDocument();
    });
  });
});
