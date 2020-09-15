/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import * as reactTestingLibrary from '@testing-library/react';
import { TrustedAppsPage } from './trusted_apps_page';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { fireEvent } from '@testing-library/dom';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => 'mockId',
}));

describe('TrustedAppsPage', () => {
  let history: AppContextTestRender['history'];
  let render: () => ReturnType<AppContextTestRender['render']>;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    history = mockedContext.history;
    render = () => mockedContext.render(<TrustedAppsPage />);
    reactTestingLibrary.act(() => {
      history.push('/trusted_apps');
    });
  });

  test('rendering', () => {
    expect(render()).toMatchSnapshot();
  });

  it('should display a Add Trusted App button', async () => {
    const { getByTestId } = render();
    const addButton = await getByTestId('trustedAppsListAddButton');
    expect(addButton.textContent).toBe('Add Trusted Application');
  });

  describe('when the Add Trusted App button is clicked', () => {
    const renderAndClickAddButton = async (): Promise<
      ReturnType<AppContextTestRender['render']>
    > => {
      const renderResult = render();
      const addButton = await renderResult.getByTestId('trustedAppsListAddButton');
      reactTestingLibrary.act(() => {
        fireEvent.click(addButton, { buttton: 1 });
      });
      return renderResult;
    };

    it('should display the create flyout', async () => {
      const { getByTestId } = await renderAndClickAddButton();
      const flyout = getByTestId('addTrustedAppFlyout');
      expect(flyout).not.toBeNull();

      const flyoutTitle = getByTestId('addTrustedAppFlyout-headerTitle');
      expect(flyoutTitle.textContent).toBe('Add trusted application');
    });

    it('should update the URL to indicate the flyout is opened', async () => {
      await renderAndClickAddButton();
      expect(/show\=create/.test(history.location.search)).toBe(true);
    });

    it('should preserve other URL search params', async () => {
      reactTestingLibrary.act(() => {
        history.push('/trusted_apps?page_index=2&page_size=20');
      });
      await renderAndClickAddButton();
      expect(history.location.search).toBe('?page_index=2&page_size=20&show=create');
    });

    it('should display create form', async () => {
      const { getByTestId } = await renderAndClickAddButton();
      expect(getByTestId('addTrustedAppFlyout-createForm')).toMatchSnapshot();
    });

    it.todo('should initially have the Add button disabled');

    it.todo('should close flyout if cancel button is clicked');

    it.todo('should close flyout if flyout button is clicked');

    describe('and when the form data is valid', () => {
      it.todo('should enable the Flyout Add button');

      describe('and the Flyout Add button is clicked', () => {
        it.todo('should disable the Cancel button');

        it.todo('should hide the dialog close button');

        it.todo('should disable the flyout Add button and set it to loading');

        describe('and if create was successful', () => {
          it.todo('should close the flyout');

          it.todo('should show success toast notification');

          it.todo('should trigger the List to reload');
        });

        describe('and if create failed', () => {
          it.todo('should enable the Cancel Button');

          it.todo('should show the dialog close button');

          it.todo('should enable the flyout Add button and remove loading indicating');

          it.todo('should show API errors in the form');
        });
      });
    });
  });
});
