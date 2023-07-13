/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { FleetPackagePolicyGenerator } from '../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import React from 'react';
import type { EventCollectionCardProps } from './event_collection_card';
import { EventCollectionCard } from './event_collection_card';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { expectIsViewOnly, matchExactTextContent } from '../mocks';
import userEvent from '@testing-library/user-event';
import { cloneDeep, set } from 'lodash';

describe('Policy Event Collection Card common component', () => {
  let formProps: EventCollectionCardProps<OperatingSystem.WINDOWS>;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    const policy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
      .config.policy.value;

    formProps = {
      policy,
      onChange: jest.fn(),
      mode: 'edit',
      'data-test-subj': 'test',
      os: OperatingSystem.WINDOWS,
      selection: {
        file: policy.windows.events.file,
        network: policy.windows.events.network,
        // For testing purposes, limit the number of events to only 2
      } as typeof policy.windows.events,
      options: [
        {
          name: 'File',
          protectionField: 'file',
        },
        {
          name: 'Network',
          protectionField: 'network',
        },
      ],
    };

    render = () => {
      renderResult = mockedContext.render(
        <EventCollectionCard<OperatingSystem.WINDOWS> {...formProps} />
      );
      return renderResult;
    };
  });

  it('should render card with expected content', () => {
    const { getByTestId } = render();

    expect(getByTestId('test-selectedCount')).toHaveTextContent(
      matchExactTextContent('2 / 2 event collections enabled')
    );
    expect(getByTestId('test-osValues')).toHaveTextContent(matchExactTextContent('Windows'));
    expect(getByTestId<HTMLInputElement>('test-file').checked).toBe(true);
    expect(getByTestId<HTMLInputElement>('test-network').checked).toBe(true);
  });

  it('should allow items to be unchecked', () => {
    const expectedUpdatedPolicy = cloneDeep(formProps.policy);
    set(expectedUpdatedPolicy, 'windows.events.file', false);
    render();
    userEvent.click(renderResult.getByTestId('test-file'));

    expect(formProps.onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: expectedUpdatedPolicy,
    });
  });

  it('should allow items to be checked', () => {
    set(formProps.policy, 'windows.events.file', false);
    formProps.selection.file = false;

    const expectedUpdatedPolicy = cloneDeep(formProps.policy);
    set(expectedUpdatedPolicy, 'windows.events.file', true);

    const { getByTestId } = render();

    expect(getByTestId('test-selectedCount')).toHaveTextContent(
      matchExactTextContent('1 / 2 event collections enabled')
    );
    expect(getByTestId<HTMLInputElement>('test-file').checked).toBe(false);

    userEvent.click(getByTestId('test-file'));

    expect(formProps.onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: expectedUpdatedPolicy,
    });
  });

  describe('and supplementalOptions are used', () => {
    // FIXME:PT implement
  });

  describe('and when rendered in View mode', () => {
    beforeEach(() => {
      formProps.mode = 'view';
    });

    it('should render with expected content', () => {
      render();

      expectIsViewOnly(renderResult.getByTestId('test'));
      expect(renderResult.getByTestId('test-selectedCount')).toHaveTextContent(
        matchExactTextContent('2 / 2 event collections enabled')
      );
      expect(renderResult.getByTestId('test-options')).toHaveTextContent(
        matchExactTextContent('FileNetwork')
      );
    });

    it('should only display events that were checked', () => {
      set(formProps.policy, 'windows.events.file', false);
      formProps.selection.file = false;
      render();

      expect(renderResult.getByTestId('test-selectedCount')).toHaveTextContent(
        matchExactTextContent('1 / 2 event collections enabled')
      );
      expect(renderResult.getByTestId('test-options')).toHaveTextContent(
        matchExactTextContent('Network')
      );
    });

    it('should show empty value if no events are selected', () => {
      set(formProps.policy, 'windows.events.file', false);
      set(formProps.policy, 'windows.events.network', false);
      formProps.selection.file = false;
      formProps.selection.network = false;
      render();

      expect(renderResult.getByTestId('test-selectedCount')).toHaveTextContent(
        matchExactTextContent('0 / 2 event collections enabled')
      );
      expect(renderResult.getByTestId('test-options')).toHaveTextContent(
        matchExactTextContent('—')
      );
    });
  });
});
