/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';

import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { ObservableTypesList, type ObservableTypesListProps } from '.';

const observableTypes = [
  { label: 'Test Observable Type', key: 'deb68304-da86-483c-b5ed-ff5b3420e340' },
  { label: 'Test Observable Type vol 2', key: '532433db-045f-4ccc-b73c-db9441f0eefa' },
];

describe('ObservableTypesList', () => {
  let user: UserEvent;
  let appMockRender: AppMockRenderer;

  const props: ObservableTypesListProps = {
    observableTypes,
    onDeleteObservableType: jest.fn(),
    onEditObservableType: jest.fn(),
  };

  beforeEach(() => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
    });

    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', () => {
    appMockRender.render(<ObservableTypesList {...props} />);

    expect(screen.getByTestId('observable-types-list')).toBeInTheDocument();
  });

  it('shows ObservableTypesList correctly', async () => {
    appMockRender.render(<ObservableTypesList {...props} />);

    expect(await screen.findByTestId('observable-types-list')).toBeInTheDocument();

    expect(
      await screen.findByTestId(`observable-type-${observableTypes[0].key}`)
    ).toBeInTheDocument();
    expect((await screen.findAllByText('Test Observable Type')).length).toBe(1);
    expect(
      await screen.findByTestId(`observable-type-${observableTypes[1].key}`)
    ).toBeInTheDocument();
  });

  describe('Delete', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('shows confirmation modal when deleting a field ', async () => {
      appMockRender.render(<ObservableTypesList {...props} />);

      const list = await screen.findByTestId('observable-types-list');

      await user.click(
        await within(list).findByTestId(`${observableTypes[0].key}-observable-type-delete`)
      );

      expect(await screen.findByTestId('confirm-delete-modal')).toBeInTheDocument();
    });

    it('calls onDeleteObservableType when confirm', async () => {
      appMockRender.render(<ObservableTypesList {...props} />);

      const list = await screen.findByTestId('observable-types-list');

      await user.click(
        await within(list).findByTestId(`${observableTypes[0].key}-observable-type-delete`)
      );

      expect(await screen.findByTestId('confirm-delete-modal')).toBeInTheDocument();

      await user.click(await screen.findByText('Delete'));

      await waitFor(() => {
        expect(screen.queryByTestId('confirm-delete-modal')).not.toBeInTheDocument();
        expect(props.onDeleteObservableType).toHaveBeenCalledWith(observableTypes[0].key);
      });
    });

    it('does not call onDeleteObservableType when cancel', async () => {
      appMockRender.render(<ObservableTypesList {...props} />);

      const list = await screen.findByTestId('observable-types-list');

      await user.click(
        await within(list).findByTestId(`${observableTypes[0].key}-observable-type-delete`)
      );

      expect(await screen.findByTestId('confirm-delete-modal')).toBeInTheDocument();

      await user.click(await screen.findByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByTestId('confirm-delete-modal')).not.toBeInTheDocument();
        expect(props.onDeleteObservableType).not.toHaveBeenCalledWith();
      });
    });
  });

  describe('Edit', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('calls onEditObservableType correctly', async () => {
      appMockRender.render(<ObservableTypesList {...props} />);

      const list = await screen.findByTestId('observable-types-list');

      await user.click(
        await within(list).findByTestId(`${observableTypes[0].key}-observable-type-edit`)
      );

      await waitFor(() => {
        expect(props.onEditObservableType).toHaveBeenCalledWith(observableTypes[0].key);
      });
    });
  });
});
