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
import type {
  EventCollectionCardProps,
  SupplementalEventFormOption,
} from './event_collection_card';
import { EventCollectionCard } from './event_collection_card';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { expectIsViewOnly, exactMatchText } from '../mocks';
import userEvent from '@testing-library/user-event';
import { cloneDeep, set } from 'lodash';
import { within } from '@testing-library/react';

describe('Policy Event Collection Card common component', () => {
  let formProps: EventCollectionCardProps<OperatingSystem.WINDOWS>;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  const isChecked = (selector: string): boolean => {
    return (renderResult.getByTestId(selector) as HTMLInputElement).checked;
  };

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
      exactMatchText('2 / 2 event collections enabled')
    );
    expect(getByTestId('test-osValues')).toHaveTextContent(exactMatchText('Windows'));
    expect(isChecked('test-file')).toBe(true);
    expect(isChecked('test-network')).toBe(true);
  });

  it('should allow items to be unchecked', async () => {
    const expectedUpdatedPolicy = cloneDeep(formProps.policy);
    set(expectedUpdatedPolicy, 'windows.events.file', false);
    render();
    await userEvent.click(renderResult.getByTestId('test-file'));

    expect(formProps.onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: expectedUpdatedPolicy,
    });
  });

  it('should allow items to be checked', async () => {
    set(formProps.policy, 'windows.events.file', false);
    formProps.selection.file = false;

    const expectedUpdatedPolicy = cloneDeep(formProps.policy);
    set(expectedUpdatedPolicy, 'windows.events.file', true);

    const { getByTestId } = render();

    expect(getByTestId('test-selectedCount')).toHaveTextContent(
      exactMatchText('1 / 2 event collections enabled')
    );
    expect(isChecked('test-file')).toBe(false);

    await userEvent.click(getByTestId('test-file'));

    expect(formProps.onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: expectedUpdatedPolicy,
    });
  });

  describe('and supplementalOptions are used', () => {
    let supplementalEntry: SupplementalEventFormOption<OperatingSystem.WINDOWS>;

    beforeEach(() => {
      formProps.selection.dns = true;
      supplementalEntry = {
        protectionField: 'dns',
        name: 'Collect DNS',
        id: 'dns',
        title: 'DNS collection',
        description: 'This collects info about DNS',
        tooltipText: 'This is a tooltip',
      };
      formProps.supplementalOptions = [supplementalEntry];
    });

    it('should render supplemental option', () => {
      const { getByTestId } = render();

      expect(getByTestId('test-selectedCount')).toHaveTextContent(
        exactMatchText('2 / 2 event collections enabled')
      );
      expect(isChecked('test-dns')).toBe(true);

      const optionContainer = within(getByTestId('test-dnsContainer'));

      expect(optionContainer.getByTestId('test-dnsTitle')).toHaveTextContent(
        exactMatchText(supplementalEntry.title!)
      );
      expect(optionContainer.getByTestId('test-dnsDescription')).toHaveTextContent(
        exactMatchText(supplementalEntry.description!)
      );
      expect(optionContainer.getAllByLabelText(supplementalEntry.name));
      expect(optionContainer.getByTestId('test-dnsTooltipIcon'));
    });

    it('should render with minimum set of options defined', () => {
      supplementalEntry = {
        name: supplementalEntry.name,
        protectionField: supplementalEntry.protectionField,
      };
      formProps.supplementalOptions = [supplementalEntry];
      render();

      expect(renderResult.getByTestId('test-dnsContainer')).toHaveTextContent(
        exactMatchText(supplementalEntry.name)
      );
    });

    it('should include BETA badge', () => {
      supplementalEntry.beta = true;
      render();

      expect(renderResult.getByTestId('test-dnsBadge')).toHaveTextContent(exactMatchText('beta'));
    });

    it('should indent entry', () => {
      supplementalEntry.indented = true;
      render();

      expect(renderResult.getByTestId('test-dnsContainer').getAttribute('style')).toMatch(
        /padding-left/
      );
    });

    it('should should render it disabled', () => {
      supplementalEntry.isDisabled = () => true;
      render();

      expect(renderResult.getByTestId('test-dns')).toBeDisabled();
    });
  });

  describe('and when rendered in View mode', () => {
    beforeEach(() => {
      formProps.mode = 'view';
    });

    it('should render with expected content', () => {
      render();

      expectIsViewOnly(renderResult.getByTestId('test'));
      expect(renderResult.getByTestId('test-selectedCount')).toHaveTextContent(
        exactMatchText('2 / 2 event collections enabled')
      );
      expect(renderResult.getByTestId('test-options')).toHaveTextContent(
        exactMatchText('FileNetwork')
      );
    });

    it('should display all events, even unchecked ones', () => {
      set(formProps.policy, 'windows.events.file', false);
      formProps.selection.file = false;
      render();

      expect(renderResult.getByTestId('test-selectedCount')).toHaveTextContent(
        exactMatchText('1 / 2 event collections enabled')
      );
      expect(renderResult.getByTestId('test-options')).toHaveTextContent(
        exactMatchText(['File', 'Network'].join(''))
      );
    });

    it('should show empty value if no events are selected', () => {
      set(formProps.policy, 'windows.events.file', false);
      set(formProps.policy, 'windows.events.network', false);
      formProps.selection.file = false;
      formProps.selection.network = false;
      render();

      expect(renderResult.getByTestId('test-selectedCount')).toHaveTextContent(
        exactMatchText('0 / 2 event collections enabled')
      );
      expect(renderResult.queryByTestId('test-options')).toBeNull();
    });

    describe('and supplemental options are used', () => {
      let supplementalEntry: SupplementalEventFormOption<OperatingSystem.WINDOWS>;

      beforeEach(() => {
        formProps.selection.dns = true;
        supplementalEntry = {
          protectionField: 'dns',
          name: 'Collect DNS',
          id: 'dns',
          title: 'DNS collection',
          description: 'This collects info about DNS',
          tooltipText: 'This is a tooltip',
        };
        formProps.supplementalOptions = [supplementalEntry];
      });

      it('should render expected content when option is checked', () => {
        render();
        const dnsContainer = renderResult.getByTestId('test-dnsContainer');

        expectIsViewOnly(dnsContainer);
        expect(dnsContainer).toHaveTextContent(
          exactMatchText('DNS collectionThis collects info about DNSCollect DNSInfo')
        );

        const dnsOption = renderResult.getByTestId('test-dns');
        expect(dnsOption).toHaveAttribute('disabled');
        expect(dnsOption).toHaveAttribute('checked');
      });

      it('should not render option if un-checked', () => {
        formProps.policy.windows.events.dns = false;
        formProps.selection.dns = false;
        render();

        const dnsContainer = renderResult.getByTestId('test-dnsContainer');
        const dnsOption = renderResult.getByTestId('test-dns');
        expectIsViewOnly(dnsContainer);
        expect(dnsContainer).toHaveTextContent(
          exactMatchText('DNS collectionThis collects info about DNSCollect DNSInfo')
        );
        expect(dnsOption).toHaveAttribute('disabled');
        expect(dnsOption).not.toHaveAttribute('checked');
      });
    });
  });
});
