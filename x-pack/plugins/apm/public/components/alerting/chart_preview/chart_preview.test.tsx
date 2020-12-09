/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithTheme } from '../../../utils/testHelpers';
import { ChartPreview } from './';

describe('ChartPreview', () => {
  it('renders', () => {
    expect(() =>
      renderWithTheme(<ChartPreview data={[{ x: 1, y: 1 }]} threshold={1} />)
    ).not.toThrowError();
  });

  describe('with no data', () => {
    it('renders empty', () => {
      const { queryByTestId } = renderWithTheme(<ChartPreview threshold={1} />);

      expect(queryByTestId('ChartPreview')).toBeInTheDocument();
    });
  });
});
