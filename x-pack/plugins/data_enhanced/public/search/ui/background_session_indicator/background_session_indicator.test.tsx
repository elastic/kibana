/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BackgroundSessionIndicator } from './background_session_indicator';
import { BackgroundSessionViewState } from '../connected_background_session_indicator';
import { IntlProvider } from 'react-intl';

function Container({ children }: { children?: ReactNode }) {
  return <IntlProvider locale="en">{children}</IntlProvider>;
}

test('Loading state', async () => {
  const onCancel = jest.fn();
  render(
    <Container>
      <BackgroundSessionIndicator state={BackgroundSessionViewState.Loading} onCancel={onCancel} />
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
      <BackgroundSessionIndicator
        state={BackgroundSessionViewState.Completed}
        onSaveResults={onSave}
      />
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
      <BackgroundSessionIndicator
        state={BackgroundSessionViewState.BackgroundLoading}
        onCancel={onCancel}
      />
    </Container>
  );

  await userEvent.click(screen.getByLabelText('Loading results in the background'));
  await userEvent.click(screen.getByText('Cancel'));

  expect(onCancel).toBeCalled();
});

test('BackgroundCompleted state', async () => {
  const onViewSession = jest.fn();
  render(
    <Container>
      <BackgroundSessionIndicator
        state={BackgroundSessionViewState.BackgroundCompleted}
        onViewBackgroundSessions={onViewSession}
      />
    </Container>
  );

  await userEvent.click(screen.getByLabelText('Results loaded in the background'));
  await userEvent.click(screen.getByText('View background sessions'));

  expect(onViewSession).toBeCalled();
});

test('Restored state', async () => {
  const onRefresh = jest.fn();
  render(
    <Container>
      <BackgroundSessionIndicator
        state={BackgroundSessionViewState.Restored}
        onRefresh={onRefresh}
      />
    </Container>
  );

  await userEvent.click(screen.getByLabelText('Results no longer current'));
  await userEvent.click(screen.getByText('Refresh'));

  expect(onRefresh).toBeCalled();
});
