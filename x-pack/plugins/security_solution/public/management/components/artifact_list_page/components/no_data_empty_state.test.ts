/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  trustedAppsAllHttpMocks,
  TrustedAppsGetListHttpMocksInterface,
} from '../../../pages/mocks';
import { act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArtifactListPageProps } from '../artifact_list_page';
import { AppContextTestRender } from '../../../../common/mock/endpoint';
import { getArtifactListPageRenderingSetup, getFormComponentMock } from '../mocks';

describe('When showing the Empty State in ArtifactListPage', () => {
  let render: (
    props?: Partial<ArtifactListPageProps>
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let history: AppContextTestRender['history'];
  let mockedApi: ReturnType<typeof trustedAppsAllHttpMocks>;
  let getLastFormComponentProps: ReturnType<
    typeof getFormComponentMock
  >['getLastFormComponentProps'];
  let originalListApiResponseProvider: TrustedAppsGetListHttpMocksInterface['trustedAppsList'];

  beforeEach(() => {
    const renderSetup = getArtifactListPageRenderingSetup();

    ({ history, mockedApi, getLastFormComponentProps } = renderSetup);

    originalListApiResponseProvider =
      mockedApi.responseProvider.trustedAppsList.getMockImplementation()!;

    render = (props = {}) => {
      mockedApi.responseProvider.trustedAppsList.mockReturnValue({
        data: [],
        page: 1,
        per_page: 10,
        total: 0,
      });

      renderResult = renderSetup.renderArtifactListPage(props);
      return renderResult;
    };
  });

  it('should display empty state', async () => {
    render();

    await waitFor(async () => {
      expect(renderResult.getByTestId('testPage-emptyState'));
    });
  });

  it('should hide page headers', async () => {
    render();

    expect(renderResult.queryByTestId('header-page-title')).toBe(null);
  });

  it('should open create flyout when primary button is clicked', async () => {
    render();
    const addButton = await renderResult.findByTestId('testPage-emptyState-addButton');

    act(() => {
      userEvent.click(addButton);
    });

    expect(renderResult.getByTestId('testPage-flyout')).toBeTruthy();
    expect(history.location.search).toMatch(/show=create/);
  });

  describe('and the first item is created', () => {
    it('should show the list after creating first item and remove empty state', async () => {
      render();
      const addButton = await renderResult.findByTestId('testPage-emptyState-addButton');

      act(() => {
        userEvent.click(addButton);
      });

      await waitFor(async () => {
        expect(renderResult.getByTestId('testPage-flyout'));
      });

      // indicate form is valid
      act(() => {
        const lastProps = getLastFormComponentProps();
        lastProps.onChange({ item: { ...lastProps.item, name: 'some name' }, isValid: true });
      });

      mockedApi.responseProvider.trustedAppsList.mockImplementation(
        originalListApiResponseProvider
      );

      // Submit form
      act(() => {
        userEvent.click(renderResult.getByTestId('testPage-flyout-submitButton'));
      });

      // wait for the list to show up
      await act(async () => {
        await waitFor(() => {
          expect(renderResult.getByTestId('testPage-list')).toBeTruthy();
        });
      });
    });
  });
});
