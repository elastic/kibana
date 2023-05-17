/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import moment from 'moment';
import React from 'react';
import { IndicatorBarchartLegendAction } from './legend_action';

jest.mock('moment');

describe('IndicatorBarchartLegendAction', () => {
  const mockDate = '14182940000';

  const mockToIsoString = jest.fn();
  beforeAll(() => {
    (moment as unknown as jest.Mock).mockReturnValue({
      toISOString: mockToIsoString,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should formate group name if it is a date type', () => {
    const mockField = {
      label: '@timestamp',
      value: 'date',
    };
    render(<IndicatorBarchartLegendAction data={mockDate} field={mockField} />);
    expect(mockToIsoString).toHaveBeenCalled();
  });

  it('should render group name without formation', () => {
    const mockField = {
      label: 'host.name',
      value: 'string',
    };
    render(<IndicatorBarchartLegendAction data={mockDate} field={mockField} />);
    expect(mockToIsoString).not.toHaveBeenCalled();
  });
});
