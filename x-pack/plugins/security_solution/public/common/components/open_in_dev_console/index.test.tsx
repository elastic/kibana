/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OpenInDevConsoleButton } from '.';
import { TestProviders } from '../../mock';

jest.mock('../../hooks/use_space_id', () => ({
  useSpaceId: jest.fn().mockReturnValue('myspace'),
}));

describe('OpenInDevConsoleButton', () => {
  it('renders an open in dev console link', () => {
    render(
      <TestProviders>
        <OpenInDevConsoleButton
          enableButton={true}
          loadFromUrl="http://localhost:1234/test"
          tooltipContent="popover"
          title="open in dev console"
        />
      </TestProviders>
    );
    expect(screen.getByTestId('open-in-console-button')).toBeInTheDocument();
  });

  it('renders a space-awared dev console link', () => {
    render(
      <TestProviders>
        <OpenInDevConsoleButton
          enableButton={true}
          loadFromUrl="http://localhost:1234/s/myspace/test"
          tooltipContent="popover"
          title="open in dev console"
        />
      </TestProviders>
    );
    expect(screen.getByTestId('open-in-console-button').getAttribute('href')).toEqual(
      '/s/myspace/app/dev_tools#/console?load_from=http://localhost:1234/s/myspace/test'
    );
  });

  it('renders a disabled button', () => {
    render(
      <TestProviders>
        <OpenInDevConsoleButton
          enableButton={false}
          loadFromUrl="http://localhost:1234/test"
          title="open in dev console"
        />
      </TestProviders>
    );
    expect(screen.getByTestId('disabled-open-in-console-button')).toBeInTheDocument();
  });

  it('renders a disabled button with popover', async () => {
    render(
      <TestProviders>
        <OpenInDevConsoleButton
          enableButton={false}
          loadFromUrl="http://localhost:1234/test"
          title="open in dev console"
          tooltipContent="tooltipContent"
        />
      </TestProviders>
    );

    act(() => {
      fireEvent.mouseEnter(screen.getByTestId('disabled-open-in-console-button-with-tooltip'));
    });
    await waitFor(() => {
      expect(
        screen.getByTestId('disabled-open-in-console-button-with-tooltip')
      ).toBeInTheDocument();
    });
  });
});
