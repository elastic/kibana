/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchSessionIndicator } from './search_session_indicator';
import { IntlProvider } from 'react-intl';
import { SearchSessionState } from '../../../../../../../src/plugins/data/public';

function Container({ children }: { children?: ReactNode }) {
  return <IntlProvider locale="en">{children}</IntlProvider>;
}

test('Loading state', async () => {
  const onCancel = jest.fn();
  render(
    <Container>
      <SearchSessionIndicator state={SearchSessionState.Loading} onCancel={onCancel} />
    </Container>
  );

  await userEvent.click(screen.getByLabelText('Loading'));
  await userEvent.click(screen.getByText('Cancel session'));

  expect(onCancel).toBeCalled();
});

test('Completed state', async () => {
  const onSave = jest.fn();
  render(
    <Container>
      <SearchSessionIndicator state={SearchSessionState.Completed} onSaveResults={onSave} />
    </Container>
  );

  await userEvent.click(screen.getByLabelText('Loaded'));
  await userEvent.click(screen.getByText('Save session'));

  expect(onSave).toBeCalled();
});

test('Loading in the background state', async () => {
  const onCancel = jest.fn();
  render(
    <Container>
      <SearchSessionIndicator state={SearchSessionState.BackgroundLoading} onCancel={onCancel} />
    </Container>
  );

  await userEvent.click(screen.getByLabelText('Loading results in the background'));
  await userEvent.click(screen.getByText('Cancel session'));

  expect(onCancel).toBeCalled();
});

test('BackgroundCompleted state', async () => {
  render(
    <Container>
      <SearchSessionIndicator
        state={SearchSessionState.BackgroundCompleted}
        viewSearchSessionsLink={'__link__'}
      />
    </Container>
  );

  await userEvent.click(screen.getByLabelText('Results loaded in the background'));
  expect(screen.getByRole('link', { name: 'View all sessions' }).getAttribute('href')).toBe(
    '__link__'
  );
});

test('Restored state', async () => {
  const onRefresh = jest.fn();
  render(
    <Container>
      <SearchSessionIndicator state={SearchSessionState.Restored} onRefresh={onRefresh} />
    </Container>
  );

  await userEvent.click(screen.getByLabelText('Results no longer current'));
  await userEvent.click(screen.getByText('Refresh'));

  expect(onRefresh).toBeCalled();
});

test('Canceled state', async () => {
  const onRefresh = jest.fn();
  render(
    <Container>
      <SearchSessionIndicator state={SearchSessionState.Canceled} onRefresh={onRefresh} />
    </Container>
  );

  await userEvent.click(screen.getByLabelText('Canceled'));
  await userEvent.click(screen.getByText('Refresh'));

  expect(onRefresh).toBeCalled();
});

test('Disabled state', async () => {
  render(
    <Container>
      <SearchSessionIndicator state={SearchSessionState.Loading} disabled={true} />
    </Container>
  );

  expect(screen.getByTestId('searchSessionIndicator').querySelector('button')).toBeDisabled();
});
