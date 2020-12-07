/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BackgroundSessionIndicator } from './background_session_indicator';
import { IntlProvider } from 'react-intl';
import { SessionState } from '../../../../../../../src/plugins/data/public';

function Container({ children }: { children?: ReactNode }) {
  return <IntlProvider locale="en">{children}</IntlProvider>;
}

test('Loading state', async () => {
  const onCancel = jest.fn();
  render(
    <Container>
      <BackgroundSessionIndicator state={SessionState.Loading} onCancel={onCancel} />
    </Container>
  );

  await userEvent.click(screen.getByLabelText('Loading results'));
  await userEvent.click(screen.getByText('Cancel'));

  expect(onCancel).toBeCalled();
});

test('Completed state', async () => {
  const onSave = jest.fn();
  render(
    <Container>
      <BackgroundSessionIndicator state={SessionState.Completed} onSaveResults={onSave} />
    </Container>
  );

  await userEvent.click(screen.getByLabelText('Results loaded'));
  await userEvent.click(screen.getByText('Save'));

  expect(onSave).toBeCalled();
});

test('Loading in the background state', async () => {
  const onCancel = jest.fn();
  render(
    <Container>
      <BackgroundSessionIndicator state={SessionState.BackgroundLoading} onCancel={onCancel} />
    </Container>
  );

  await userEvent.click(screen.getByLabelText('Loading results in the background'));
  await userEvent.click(screen.getByText('Cancel'));

  expect(onCancel).toBeCalled();
});

test('BackgroundCompleted state', async () => {
  render(
    <Container>
      <BackgroundSessionIndicator
        state={SessionState.BackgroundCompleted}
        viewBackgroundSessionsLink={'__link__'}
      />
    </Container>
  );

  await userEvent.click(screen.getByLabelText('Results loaded in the background'));
  expect(screen.getByRole('link', { name: 'View background sessions' }).getAttribute('href')).toBe(
    '__link__'
  );
});

test('Restored state', async () => {
  const onRefresh = jest.fn();
  render(
    <Container>
      <BackgroundSessionIndicator state={SessionState.Restored} onRefresh={onRefresh} />
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
      <BackgroundSessionIndicator state={SessionState.Canceled} onRefresh={onRefresh} />
    </Container>
  );

  await userEvent.click(screen.getByLabelText('Canceled'));
  await userEvent.click(screen.getByText('Refresh'));

  expect(onRefresh).toBeCalled();
});

test('Disabled state', async () => {
  render(
    <Container>
      <BackgroundSessionIndicator state={SessionState.Loading} disabled={true} />
    </Container>
  );

  expect(screen.getByTestId('backgroundSessionIndicator').querySelector('button')).toBeDisabled();
});
