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
import type { LinuxEventCollectionCardProps } from './linux_event_collection_card';
import { LinuxEventCollectionCard } from './linux_event_collection_card';
import { set } from 'lodash';

describe('Policy Linux Event Collection Card', () => {
  const testSubj = getPolicySettingsFormTestSubjects('test').linuxEvents;

  let formProps: LinuxEventCollectionCardProps;
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
      (renderResult = mockedContext.render(<LinuxEventCollectionCard {...formProps} />));
  });

  it('should render card with expected content', () => {
    const { getByTestId } = render();

    expect(
      getByTestId(testSubj.optionsContainer).querySelectorAll('input[type="checkbox"]')
    ).toHaveLength(3);
    expect(getByTestId(testSubj.fileCheckbox)).toBeChecked();
    expect(getByTestId(testSubj.networkCheckbox)).toBeChecked();
    expect(getByTestId(testSubj.processCheckbox)).toBeChecked();
    expect(getByTestId(testSubj.osValueContainer)).toHaveTextContent(exactMatchText('Linux'));
    expect(getByTestId(testSubj.sessionDataCheckbox)).not.toBeChecked();
    expect(getByTestId(testSubj.captureTerminalCheckbox)).toBeDisabled();
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
            'Linux ' +
            '3 / 3 event collections enabled' +
            'Events' +
            'File' +
            'Network' +
            'Process'
        )
      );
    });

    it('should render card with expected content when session data collection is enabled', () => {
      set(formProps.policy, 'linux.events.session_data', true);
      set(formProps.policy, 'linux.events.tty_io', true);
      set(formProps.policy, 'linux.events.file', false);
      render();

      const card = renderResult.getByTestId(testSubj.card);

      expectIsViewOnly(card);
      expect(card).toHaveTextContent(
        exactMatchText(
          'Type' +
            'Event collection' +
            'Operating system' +
            'Linux ' +
            '2 / 3 event collections enabled' +
            'Events' +
            'Network' +
            'Process' +
            'Session data' +
            'Collect session data' +
            'Capture terminal output' +
            'Info'
        )
      );
    });
  });
});
