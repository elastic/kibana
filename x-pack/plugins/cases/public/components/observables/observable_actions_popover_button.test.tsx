/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AppMockRenderer } from '../../common/mock';
import { buildCasesPermissions, createAppMockRenderer } from '../../common/mock';

import { ObservableActionsPopoverButton } from './observable_actions_popover_button';
import type { CaseUI } from '../../../common';
import type { Observable } from '../../../common/types/domain/observable/v1';
import { mockCase } from '../../containers/mock';
import { usePostObservable } from '../../containers/use_post_observables';

jest.mock('../../containers/use_post_observables');

describe('ObservableActionsPopoverButton', () => {
  let appMockRender: AppMockRenderer;
  const mutate = jest.fn().mockResolvedValue({});

  const caseData: CaseUI = { ...mockCase };
  const observable = { id: '05041f40-ac9f-4192-b367-7e6a5dafcee5' } as Observable;

  beforeEach(() => {
    jest
      .mocked(usePostObservable)
      .mockReturnValue({ mutateAsync: mutate, isLoading: false } as unknown as ReturnType<
        typeof usePostObservable
      >);
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders file actions popover button correctly', async () => {
    appMockRender.render(
      <ObservableActionsPopoverButton caseData={caseData} observable={observable} />
    );

    expect(
      await screen.findByTestId(`cases-observables-actions-popover-button-${observable.id}`)
    ).toBeInTheDocument();
  });

  it('clicking the button opens the popover', async () => {
    appMockRender.render(
      <ObservableActionsPopoverButton caseData={caseData} observable={observable} />
    );

    await userEvent.click(
      await screen.findByTestId(`cases-observables-actions-popover-button-${observable.id}`)
    );

    expect(
      await screen.findByTestId(`cases-observables-popover-${observable.id}`)
    ).toBeInTheDocument();
    expect(await screen.findByTestId('cases-observables-delete-button')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-observables-edit-button')).toBeInTheDocument();
  });

  describe('edit buttton', () => {
    it('clicking edit button opens the edit modal', async () => {
      appMockRender.render(
        <ObservableActionsPopoverButton caseData={caseData} observable={observable} />
      );

      await userEvent.click(
        await screen.findByTestId(`cases-observables-actions-popover-button-${observable.id}`)
      );

      await userEvent.click(await screen.findByTestId('cases-observables-edit-button'), {
        pointerEventsCheck: 0,
      });

      expect(await screen.findByTestId('case-observables-edit-modal')).toBeInTheDocument();
    });
  });

  describe('delete button', () => {
    it('clicking delete button opens the confirmation modal', async () => {
      appMockRender.render(
        <ObservableActionsPopoverButton caseData={caseData} observable={observable} />
      );

      await userEvent.click(
        await screen.findByTestId(`cases-observables-actions-popover-button-${observable.id}`)
      );

      await userEvent.click(await screen.findByTestId('cases-observables-delete-button'), {
        pointerEventsCheck: 0,
      });

      expect(await screen.findByTestId('property-actions-confirm-modal')).toBeInTheDocument();
    });

    it('clicking delete button in the confirmation modal calls deleteFileAttachment with proper params', async () => {
      appMockRender.render(
        <ObservableActionsPopoverButton caseData={caseData} observable={observable} />
      );

      await userEvent.click(
        await screen.findByTestId(`cases-observables-actions-popover-button-${observable.id}`)
      );

      await userEvent.click(await screen.findByTestId('cases-observables-delete-button'), {
        pointerEventsCheck: 0,
      });

      expect(await screen.findByTestId('property-actions-confirm-modal')).toBeInTheDocument();

      await userEvent.click(await screen.findByTestId('confirmModalConfirmButton'));

      await waitFor(() => {
        expect(mutate).toHaveBeenCalledTimes(1);
        expect(mutate).toHaveBeenCalledWith({
          caseId: 'mock-id',
          version: expect.any(String),
          observables: [],
        });
      });
    });

    it('delete button is not rendered if user has no delete permission', async () => {
      appMockRender = createAppMockRenderer({
        permissions: buildCasesPermissions({ delete: false }),
      });

      appMockRender.render(
        <ObservableActionsPopoverButton caseData={caseData} observable={observable} />
      );

      await userEvent.click(
        await screen.findByTestId(`cases-observables-actions-popover-button-${observable.id}`)
      );

      expect(screen.queryByTestId('cases-observables-delete-button')).not.toBeInTheDocument();
    });
  });
});
