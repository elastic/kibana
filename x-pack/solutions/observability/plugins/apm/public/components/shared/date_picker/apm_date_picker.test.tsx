/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ApmDatePicker } from './apm_date_picker';

// Capture props passed to DatePicker without rendering the EUI date picker tree.
jest.mock('.', () => ({
  DatePicker: jest.fn(() => null),
}));

jest.mock('../../../hooks/use_apm_params', () => ({
  useApmParams: () => ({
    query: {
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      refreshPaused: 'false',
      refreshInterval: '1000',
    },
  }),
}));

const mockIncrementTimeRangeId = jest.fn();

jest.mock('../../../context/time_range_id/use_time_range_id', () => ({
  useTimeRangeId: jest.fn(),
}));

import { DatePicker } from '.';
import { useTimeRangeId } from '../../../context/time_range_id/use_time_range_id';

function renderPicker(isAutoRefreshPaused: boolean) {
  (useTimeRangeId as jest.Mock).mockReturnValue({
    incrementTimeRangeId: mockIncrementTimeRangeId,
    isAutoRefreshPaused,
    pauseAutoRefresh: jest.fn(),
    resumeAutoRefresh: jest.fn(),
  });
  render(<ApmDatePicker />);
}

describe('ApmDatePicker — auto-refresh pause', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes refreshPaused=false when URL is false and no flyout is open', () => {
    renderPicker(false);
    expect(DatePicker).toHaveBeenCalledWith(
      expect.objectContaining({ refreshPaused: false }),
      expect.anything()
    );
  });

  it('passes refreshPaused=true when a flyout is open, even though URL says false', () => {
    renderPicker(true);
    expect(DatePicker).toHaveBeenCalledWith(
      expect.objectContaining({ refreshPaused: true }),
      expect.anything()
    );
  });
});
