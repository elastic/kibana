/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { eventRenderedProps, TestProviders } from '../../../mock';
import { EventRenderedView } from '.';

describe('event_rendered_view', () => {
  test('it renders the timestamp correctly', () => {
    render(
      <TestProviders>
        <EventRenderedView {...eventRenderedProps} />
      </TestProviders>
    );
    expect(screen.queryAllByTestId('moment-date')[0].textContent).toEqual(
      '2018-11-05T14:03:25-05:00'
    );
  });
});
