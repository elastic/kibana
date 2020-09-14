/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import * as reactTestingLibrary from '@testing-library/react';
import { TrustedAppsPage } from './trusted_apps_page';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../../common/mock/endpoint';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => 'mockId',
}));

describe('TrustedAppsPage', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    render = () => mockedContext.render(<TrustedAppsPage />);
    reactTestingLibrary.act(() => {
      mockedContext.history.push('/trusted_apps');
    });
  });

  test('rendering', () => {
    expect(render()).toMatchSnapshot();
  });

  it.todo('should display a Add Trusted App button');

  describe('when the Add Trusted App button is clicked', () => {
    it.todo('should display the create flyout');

    it.todo('should update the URL to indicate the flyout is opened');

    it.todo('should preserve other URL search params');

    it.todo('should display create form'); // TODO: candidate for snapshot test here

    it.todo('should initialy have the Add button disabled');

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
