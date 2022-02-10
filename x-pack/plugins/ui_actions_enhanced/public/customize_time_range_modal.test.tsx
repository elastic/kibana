/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { CustomizeTimeRangeModal } from './customize_time_range_modal';
import { Embeddable } from '../../../../src/plugins/embeddable/public';
import { TimeRangeInput } from './custom_time_range_action';

test("Doesn't display refresh interval options", () => {
  render(
    <CustomizeTimeRangeModal
      embeddable={
        {
          getInput: () => ({ timerange: { from: 'now-7d', to: 'now' } }),
        } as unknown as Embeddable<TimeRangeInput>
      }
      onClose={() => {}}
      commonlyUsedRanges={[]}
    />
  );

  expect(screen.getByTestId('superDatePickerToggleQuickMenuButton')).toBeInTheDocument();
  expect(screen.queryByTitle(/auto refresh/gi)).not.toBeInTheDocument();
});
