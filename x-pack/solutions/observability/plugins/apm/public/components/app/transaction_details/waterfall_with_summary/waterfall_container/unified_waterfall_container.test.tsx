/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { composeStories } from '@storybook/react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { disableConsoleWarning, renderWithTheme } from '../../../../../utils/test_helpers';
import * as stories from './unified_waterfall_container.stories';

const { Example } = composeStories(stories);

describe('UnifiedWaterfallContainer', () => {
  let consoleMock: jest.SpyInstance;

  beforeAll(() => {
    consoleMock = disableConsoleWarning('Warning: componentWillReceiveProps');
  });

  afterAll(() => {
    consoleMock.mockRestore();
  });

  it('expands and contracts the accordion', async () => {
    renderWithTheme(<Example />);

    const accordionButton = await waitFor(() =>
      screen.getByTestId('traceWaterfallAccordionButton')
    );

    expect(accordionButton.querySelector('[data-euiicon-type="fold"]')).toBeInTheDocument();

    fireEvent.click(accordionButton);

    await waitFor(() => {
      expect(accordionButton.querySelector('[data-euiicon-type="unfold"]')).toBeInTheDocument();
    });
  });
});
