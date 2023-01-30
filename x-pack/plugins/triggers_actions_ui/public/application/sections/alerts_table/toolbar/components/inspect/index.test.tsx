/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';

import { InspectButton } from '.';

jest.mock('./modal', () => ({
  ModalInspectQuery: jest.fn(() => <div data-test-subj="mocker-modal" />),
}));

describe('Inspect Button', () => {
  const getInspectQuery = () => {
    return {
      request: [''],
      response: [''],
    };
  };

  afterEach(() => {
    cleanup();
  });

  test('inspect button', async () => {
    render(<InspectButton getInspectQuery={getInspectQuery} showInspectButton />);
    expect((await screen.findAllByTestId('inspect-icon-button'))[0]).toBeInTheDocument();
  });

  test('it does NOT render the button when showInspectButton is false', async () => {
    render(<InspectButton getInspectQuery={getInspectQuery} />);
    expect(screen.queryByTestId('inspect-icon-button')).not.toBeInTheDocument();
  });

  test('open Inspect Modal', async () => {
    render(<InspectButton showInspectButton getInspectQuery={getInspectQuery} />);
    fireEvent.click(await screen.findByTestId('inspect-icon-button'));

    expect(await screen.findByTestId('mocker-modal')).toBeInTheDocument();
  });
});
