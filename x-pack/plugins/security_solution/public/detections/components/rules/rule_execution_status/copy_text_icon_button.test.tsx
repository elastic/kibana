/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { copyToClipboard } from '@elastic/eui';

import { CopyTextIconButton } from './copy_text_icon_button';

jest.mock('@elastic/eui', () => {
  const originalModule = jest.requireActual('@elastic/eui');
  return {
    ...originalModule,
    copyToClipboard: jest.fn(),
  };
});

describe('CopyTextIconButton', () => {
  it('clicking a button copies the text', () => {
    const { getByRole } = render(<CopyTextIconButton textToCopy="test-message" />);

    fireEvent.click(getByRole('button'));

    expect(copyToClipboard).toBeCalledWith('test-message');
  });

  it('tooltip text changes after clicking the button', async () => {
    const { getByRole } = render(<CopyTextIconButton textToCopy="test-message" />);

    fireEvent.mouseOver(getByRole('button'), { bubbles: true });
    expect(await screen.findByText('Copy text')).toBeInTheDocument();

    fireEvent.click(getByRole('button'), { bubbles: true });
    expect(await screen.findByText('Text copied to clipboard')).toBeInTheDocument();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});
