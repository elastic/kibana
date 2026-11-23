/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { composeStories } from '@storybook/react';
import { render } from '@testing-library/react';
import React from 'react';
import { userEvent } from '@testing-library/user-event';
import { disableConsoleWarning } from '../../../../../utils/test_helpers';
import * as stories from './waterfall_container.stories';

const { Example } = composeStories(stories);

describe('WaterfallContainer', () => {
  let consoleMock: jest.SpyInstance;

  beforeAll(() => {
    consoleMock = disableConsoleWarning('Warning: componentWillReceiveProps');
  });

  afterAll(() => {
    consoleMock.mockRestore();
  });

  it('expands and contracts the accordion', async () => {
    const user = userEvent.setup({ delay: null });
    const { getAllByRole } = render(<Example />);
    const buttons = getAllByRole('button');
    const parentItem = buttons[1];
    const childItem = buttons[3];

    await user.click(parentItem);

    expect(parentItem).toHaveAttribute('aria-expanded', 'false');
    expect(childItem).toHaveAttribute('aria-expanded', 'true');
  }, 30_000);
});
