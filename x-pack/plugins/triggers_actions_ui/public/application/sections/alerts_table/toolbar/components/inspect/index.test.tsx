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
  const querySnapshot = {
    request: [''],
    response: [''],
  };

  afterEach(() => {
    cleanup();
  });

  test('open Inspect Modal', async () => {
    render(
      <InspectButton
        inspectTitle={'Inspect Title'}
        showInspectButton
        querySnapshot={querySnapshot}
      />
    );
    fireEvent.click(await screen.findByTestId('inspect-icon-button'));

    expect(await screen.findByTestId('mocker-modal')).toBeInTheDocument();
  });
});
