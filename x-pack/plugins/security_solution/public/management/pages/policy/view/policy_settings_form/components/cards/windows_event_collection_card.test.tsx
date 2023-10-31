/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectIsViewOnly, getPolicySettingsFormTestSubjects, exactMatchText } from '../../mocks';
import type { AppContextTestRender } from '../../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../../common/mock/endpoint';
import { FleetPackagePolicyGenerator } from '../../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import React from 'react';
import { set } from 'lodash';
import type { WindowsEventCollectionCardProps } from './windows_event_collection_card';
import { WindowsEventCollectionCard } from './windows_event_collection_card';

describe('Policy Windows Event Collection Card', () => {
  const testSubj = getPolicySettingsFormTestSubjects('test').windowsEvents;

  let formProps: WindowsEventCollectionCardProps;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    formProps = {
      policy: new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
        .config.policy.value,
      onChange: jest.fn(),
      mode: 'edit',
      'data-test-subj': testSubj.card,
    };

    render = () =>
      (renderResult = mockedContext.render(<WindowsEventCollectionCard {...formProps} />));
  });

  it('should render card with expected content', () => {
    const { getByTestId } = render();

    expect(
      getByTestId(testSubj.optionsContainer).querySelectorAll('input[type="checkbox"]')
    ).toHaveLength(8);
    expect(getByTestId(testSubj.credentialsCheckbox)).toBeChecked();
    expect(getByTestId(testSubj.dllCheckbox)).toBeChecked();
    expect(getByTestId(testSubj.dnsCheckbox)).toBeChecked();
    expect(getByTestId(testSubj.fileCheckbox)).toBeChecked();
    expect(getByTestId(testSubj.networkCheckbox)).toBeChecked();
    expect(getByTestId(testSubj.processCheckbox)).toBeChecked();
    expect(getByTestId(testSubj.registryCheckbox)).toBeChecked();
    expect(getByTestId(testSubj.securityCheckbox)).toBeChecked();
    expect(getByTestId(testSubj.osValueContainer)).toHaveTextContent(exactMatchText('Windows'));
  });

  describe('and is displayed in View mode', () => {
    beforeEach(() => {
      formProps.mode = 'view';
    });

    it('should render card with expected content when session data collection is disabled', () => {
      render();
      const card = renderResult.getByTestId(testSubj.card);

      expectIsViewOnly(card);
      expect(card).toHaveTextContent(
        exactMatchText(
          'Type' +
            'Event collection' +
            'Operating system' +
            'Windows 8 / 8 event collections enabled' +
            'Events' +
            'API' +
            'DLL and Driver Load' +
            'DNS' +
            'File' +
            'Network' +
            'Process' +
            'Registry' +
            'Security'
        )
      );
    });

    it('should render card with expected content when some events are un-checked', () => {
      set(formProps.policy, 'windows.events.file', false);
      set(formProps.policy, 'windows.events.dns', false);
      render();

      const card = renderResult.getByTestId(testSubj.card);

      expectIsViewOnly(card);
      expect(card).toHaveTextContent(
        exactMatchText(
          'Type' +
            'Event collection' +
            'Operating system' +
            'Windows ' +
            '6 / 8 event collections enabled' +
            'Events' +
            'API' +
            'DLL and Driver Load' +
            'Network' +
            'Process' +
            'Registry' +
            'Security'
        )
      );
    });
  });
});
