/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import type { trustedAppsAllHttpMocks } from '../../../mocks';
import type { ArtifactListPageRenderingSetup } from '../mocks';
import { getArtifactListPageRenderingSetup } from '../mocks';
import { act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDeferred } from '../../mocks';

// FLAKY: https://github.com/elastic/kibana/issues/141459
describe.skip('When displaying the Delete artifact modal in the Artifact List Page', () => {
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let history: AppContextTestRender['history'];
  let coreStart: AppContextTestRender['coreStart'];
  let mockedApi: ReturnType<typeof trustedAppsAllHttpMocks>;
  let getFirstCard: ArtifactListPageRenderingSetup['getFirstCard'];
  let cancelButton: HTMLButtonElement;
  let submitButton: HTMLButtonElement;

  const clickCardAction = async (action: 'edit' | 'delete') => {
    await getFirstCard({ showActions: true });
    act(() => {
      switch (action) {
        case 'delete':
          userEvent.click(renderResult.getByTestId('testPage-card-cardDeleteAction'));
          break;

        case 'edit':
          userEvent.click(renderResult.getByTestId('testPage-card-cardEditAction'));
          break;
      }
    });
  };

  beforeEach(
    async () => {
      const renderSetup = getArtifactListPageRenderingSetup();

      ({ history, coreStart, mockedApi, getFirstCard } = renderSetup);

      history.push('somepage?show=create');

      renderResult = renderSetup.renderArtifactListPage();

      await act(async () => {
        await waitFor(() => {
          expect(renderResult.getByTestId('testPage-list')).toBeTruthy();
        });
      });

      await clickCardAction('delete');

      // Wait for the dialog to be present
      await act(async () => {
        await waitFor(() => {
          expect(renderResult.getByTestId('testPage-deleteModal')).not.toBeNull();
        });
      });

      cancelButton = renderResult.getByTestId(
        'testPage-deleteModal-cancelButton'
      ) as HTMLButtonElement;

      submitButton = renderResult.getByTestId(
        'testPage-deleteModal-submitButton'
      ) as HTMLButtonElement;
    },
    // Timeout set to 10s
    // In some cases, whose causes are unknown, a test will timeout and will point
    // to this setup as the culprid. It rarely happens, but in order to avoid it,
    // the timeout below is being set to 10s
    10000
  );

  // FLAKY: https://github.com/elastic/kibana/issues/139527
  it.skip('should show Cancel and Delete buttons enabled', async () => {
    expect(cancelButton).toBeEnabled();
    expect(submitButton).toBeEnabled();
  });

  // FLAKY: https://github.com/elastic/kibana/issues/139528
  it.skip('should close modal if Cancel/Close buttons are clicked', async () => {
    userEvent.click(cancelButton);

    expect(renderResult.queryByTestId('testPage-deleteModal')).toBeNull();
  });

  it('should prevent modal from being closed while deletion is in flight', async () => {
    const deferred = getDeferred();
    mockedApi.responseProvider.trustedAppDelete.mockDelay.mockReturnValue(deferred.promise);

    act(() => {
      userEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(cancelButton).toBeEnabled();
      expect(submitButton).toBeEnabled();
    });

    await act(async () => {
      deferred.resolve(); // cleanup
    });
  });

  it('should show success toast if deleted successfully', async () => {
    act(() => {
      userEvent.click(submitButton);
    });

    await act(async () => {
      await waitFor(() => {
        expect(mockedApi.responseProvider.trustedAppDelete).toHaveBeenCalled();
      });
    });

    expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith(
      expect.stringMatching(/ has been removed$/)
    );
  });

  // FIXME:PT investigate test failure
  // (I don't understand why its failing... All assertions are successful -- HELP!)
  it.skip('should show error toast if deletion failed', async () => {
    mockedApi.responseProvider.trustedAppDelete.mockImplementation(() => {
      throw new Error('oh oh');
    });

    act(() => {
      userEvent.click(submitButton);
    });

    await act(async () => {
      await waitFor(() => {
        expect(mockedApi.responseProvider.trustedAppDelete).toHaveBeenCalled();
      });
    });

    expect(coreStart.notifications.toasts.addDanger).toHaveBeenCalledWith(
      expect.stringMatching(/^Unable to remove .*\. Reason: oh oh/)
    );
    expect(renderResult.getByTestId('testPage-deleteModal')).toBeTruthy();
    expect(cancelButton).toBeEnabled();
    expect(submitButton).toBeEnabled();
  });
});
