/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { Delayed } from './helpers';
import { act } from 'react-dom/test-utils';

const children = <h1 data-test-subj="h1">{'random child element'}</h1>;
jest.useFakeTimers();
describe('Delayed', () => {
  it('renders children after half a second', async () => {
    await act(async () => {
      const { container } = render(<Delayed>{children}</Delayed>);
      expect(container.querySelector(`[data-test-subj="h1"]`)).not.toBeInTheDocument();
      jest.advanceTimersByTime(500);
      expect(container.querySelector(`[data-test-subj="h1"]`)).toBeInTheDocument();
    });
  });

  it('renders children after waitBeforeShow time', async () => {
    await act(async () => {
      const { container } = render(<Delayed waitBeforeShow={1000}>{children}</Delayed>);
      expect(container.querySelector(`[data-test-subj="h1"]`)).not.toBeInTheDocument();
      jest.advanceTimersByTime(500);
      expect(container.querySelector(`[data-test-subj="h1"]`)).not.toBeInTheDocument();
      // 500 + 500 = 1000
      jest.advanceTimersByTime(500);
      expect(container.querySelector(`[data-test-subj="h1"]`)).toBeInTheDocument();
    });
  });
});
