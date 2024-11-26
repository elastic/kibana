/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { Footer } from '.';

describe('Footer', () => {
  const closeModal = jest.fn();
  const onReset = jest.fn();
  const onSave = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('calls onReset when the reset button is clicked', () => {
    render(<Footer closeModal={closeModal} onReset={onReset} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('reset'));

    expect(onReset).toHaveBeenCalled();
  });

  it('calls closeModal when the cancel button is clicked', () => {
    render(<Footer closeModal={closeModal} onReset={onReset} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('cancel'));

    expect(closeModal).toHaveBeenCalled();
  });

  it('calls onSave when the save button is clicked', () => {
    render(<Footer closeModal={closeModal} onReset={onReset} onSave={onSave} />);
    fireEvent.click(screen.getByTestId('save'));

    expect(onSave).toHaveBeenCalled();
  });
});
