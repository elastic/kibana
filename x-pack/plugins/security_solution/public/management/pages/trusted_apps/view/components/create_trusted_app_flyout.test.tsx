/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as reactTestingLibrary from '@testing-library/react';
import { fireEvent, getByTestId } from '@testing-library/dom';
import {
  ConditionEntryField,
  NewTrustedApp,
  OperatingSystem,
} from '../../../../../../common/endpoint/types';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../common/mock/endpoint';

import { CreateTrustedAppFlyout, CreateTrustedAppFlyoutProps } from './create_trusted_app_flyout';
import { defaultNewTrustedApp } from '../../store/builders';
import { forceHTMLElementOffsetWidth } from './effected_policy_select/test_utils';
import { EndpointDocGenerator } from '../../../../../../common/endpoint/generate_data';
import { licenseService } from '../../../../../common/hooks/use_license';
import { getTrustedAppsListPath } from '../../../../common/routing';

jest.mock('../../../../../common/hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: jest.fn(),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});

jest.mock('../hooks', () => {
  const isEditMode = {
    isEdit: jest.fn(),
  };
  return {
    useTrustedAppsSelector: () => {

  useTrustedAppsSelector: (isEdit) => {
    return true;
}});

describe('When opening the Trusted App Flyout', () => {
  const dataTestSubjForFlyout = 'createFlyout';
  const generator = new EndpointDocGenerator('effected-policy-select');

  let resetHTMLElementOffsetWidth: ReturnType<typeof forceHTMLElementOffsetWidth>;

  let mockedContext: AppContextTestRender;
  let flyoutProps: jest.Mocked<CreateTrustedAppFlyoutProps>;
  let renderResult: ReturnType<AppContextTestRender['render']>;

  // As the form's `onChange()` callback is executed, this variable will
  // hold the latest updated trusted app. Use it to re-render
  let latestUpdatedTrustedApp: NewTrustedApp;

  const getUI = () => <CreateTrustedAppFlyout {...flyoutProps} />;
  const render = () => {
    return (renderResult = mockedContext.render(getUI()));
  };

  beforeEach(() => {
    resetHTMLElementOffsetWidth = forceHTMLElementOffsetWidth();
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(true);
    // useTrustedAppsSelector(isEdit)
    // isGlobalEffectScope

    mockedContext = createAppRootMockRenderer();
    // can set an experimental flag through mocked context
    mockedContext.setExperimentalFlag({trustedAppsByPolicyEnabled: true});
    // mockedContext.startServices.licensing.license$
    mockedContext.history.push(getTrustedAppsListPath({show: 'edit'}));

    latestUpdatedTrustedApp = defaultNewTrustedApp();

    flyoutProps = {
      'data-test-subj': dataTestSubjForFlyout,
      onClose: jest.fn(),
    };
  });

  afterEach(() => {
    resetHTMLElementOffsetWidth();
    reactTestingLibrary.cleanup();
  });

  describe('and the license is downgraded to gold or below', () => {
    // beforeEach(() => render());

    it('shows a message at the top of the flyout to inform the user their license is expired', () => {
      render();
      console.log(renderResult.baseElement.outerHTML);
      expect(
        renderResult.queryByTestId(`${dataTestSubjForFlyout}-expired-license-callout`)
      ).toBeTruthy();
    });
  });
});
