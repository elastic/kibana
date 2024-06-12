/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { EndpointPolicyCreateExtension } from './endpoint_policy_create_extension';
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  NewPackagePolicyInputStream,
} from '@kbn/fleet-plugin/common';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { licenseService } from '../../../../../../common/hooks/use_license';
import type { PackagePolicyCreateExtensionComponentProps } from '@kbn/fleet-plugin/public';

jest.mock('../../../../../../common/lib/kibana');
jest.mock('../../../../../../common/hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: jest.fn(),
    isEnterprise: jest.fn(() => true),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});

const getMockNewPackage = (): NewPackagePolicy => {
  const mockNewPackagePolicyInputStream: NewPackagePolicyInputStream = {
    enabled: true,
    data_stream: {
      dataset: 'someDataset',
      type: 'someType',
    },
  };

  const mockNewPackagePolicyInput: NewPackagePolicyInput = {
    type: 'someType',
    enabled: true,
    streams: [mockNewPackagePolicyInputStream],
  };

  const mockNewPackage: NewPackagePolicy = {
    id: 'someid',
    inputs: [mockNewPackagePolicyInput],
    name: 'someName',
    namespace: 'someNamespace',
    enabled: true,
    policy_id: 'somePolicyid',
    policy_ids: ['somePolicyid'],
  };
  return mockNewPackage;
};

describe('Onboarding Component new section', () => {
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When EndpointPolicyCreateExtension is mounted', () => {
    it('renders EndpointPolicyCreateExtension options correctly (Default to Endpoint)', async () => {
      renderResult = mockedContext.render(
        <EndpointPolicyCreateExtension newPolicy={getMockNewPackage()} onChange={jest.fn()} />
      );
      expect(renderResult.getByTestId('selectIntegrationTypeId')).toBeVisible();
      expect(renderResult.queryByText('Next-Generation Antivirus (NGAV)')).toBeVisible();
      expect(
        renderResult.queryByText('Essential EDR (Endpoint Detection & Response)')
      ).toBeVisible();
      expect(
        renderResult.queryByText('Complete EDR (Endpoint Detection & Response)')
      ).toBeVisible();
    });

    it('renders EndpointPolicyCreateExtension options correctly (set to Cloud)', async () => {
      renderResult = mockedContext.render(
        <EndpointPolicyCreateExtension newPolicy={getMockNewPackage()} onChange={jest.fn()} />
      );
      userEvent.selectOptions(screen.getByTestId('selectIntegrationTypeId'), ['cloud']);
      expect(renderResult.getByText('Interactive only')).toBeVisible();
      expect(renderResult.getByText('All events')).toBeVisible();
    });

    it('make sure onChange is called when user change environment', async () => {
      const mockedOnChange = jest.fn();
      renderResult = mockedContext.render(
        <EndpointPolicyCreateExtension newPolicy={getMockNewPackage()} onChange={mockedOnChange} />
      );
      expect(mockedOnChange).toHaveBeenCalledTimes(1);
      userEvent.selectOptions(screen.getByTestId('selectIntegrationTypeId'), ['cloud']);
      expect(mockedOnChange).toHaveBeenCalledTimes(2);
    });

    it('make sure EDR Complete is the default value for endpoint environment', async () => {
      renderResult = mockedContext.render(
        <EndpointPolicyCreateExtension newPolicy={getMockNewPackage()} onChange={jest.fn()} />
      );
      expect(renderResult.getByDisplayValue('DataCollection')).not.toBeChecked();
      expect(renderResult.getByDisplayValue('NGAV')).not.toBeChecked();
      expect(renderResult.getByDisplayValue('EDREssential')).not.toBeChecked();
      expect(renderResult.getByDisplayValue('EDRComplete')).toBeChecked();
    });

    it('make sure interactive only is the default value for cloud environment', async () => {
      renderResult = mockedContext.render(
        <EndpointPolicyCreateExtension newPolicy={getMockNewPackage()} onChange={jest.fn()} />
      );
      userEvent.selectOptions(screen.getByTestId('selectIntegrationTypeId'), ['cloud']);
      expect(renderResult.getByDisplayValue('ALL_EVENTS')).not.toBeChecked();
      expect(renderResult.getByDisplayValue('INTERACTIVE_ONLY')).toBeChecked();
    });

    describe('showing license notes for config presets', () => {
      it.each`
        preset              | license             | result              | text
        ${'EDREssential'}   | ${'below platinum'} | ${'should see'}     | ${'Note: advanced protections require a platinum license, and full response capabilities require an enterprise license.'}
        ${'EDREssential'}   | ${'platinum'}       | ${'should see'}     | ${'Note: advanced protections require a platinum license, and full response capabilities require an enterprise license.'}
        ${'EDREssential'}   | ${'enterprise'}     | ${'should NOT see'} | ${''}
        ${'EDRComplete'}    | ${'below platinum'} | ${'should see'}     | ${'Note: advanced protections require a platinum license, and full response capabilities require an enterprise license.'}
        ${'EDRComplete'}    | ${'platinum'}       | ${'should see'}     | ${'Note: advanced protections require a platinum license, and full response capabilities require an enterprise license.'}
        ${'EDRComplete'}    | ${'enterprise'}     | ${'should NOT see'} | ${''}
        ${'NGAV'}           | ${'below platinum'} | ${'should see'}     | ${'Note: advanced protections require a platinum license level.'}
        ${'NGAV'}           | ${'platinum'}       | ${'should NOT see'} | ${''}
        ${'NGAV'}           | ${'enterprise'}     | ${'should NOT see'} | ${''}
        ${'DataCollection'} | ${'below platinum'} | ${'should NOT see'} | ${''}
        ${'DataCollection'} | ${'platinum'}       | ${'should NOT see'} | ${''}
        ${'DataCollection'} | ${'enterprise'}     | ${'should NOT see'} | ${''}
      `('$preset: $license users $result notes', ({ license, preset, result, text }) => {
        const isEnterprise = license === 'enterprise';
        const isPlatinumPlus = ['platinum', 'enterprise'].includes(license);

        const licenseServiceMock = licenseService as jest.Mocked<typeof licenseService>;
        licenseServiceMock.isEnterprise.mockReturnValue(isEnterprise);
        licenseServiceMock.isPlatinumPlus.mockReturnValue(isPlatinumPlus);

        renderResult = mockedContext.render(
          <EndpointPolicyCreateExtension newPolicy={getMockNewPackage()} onChange={jest.fn()} />
        );
        userEvent.click(screen.getByDisplayValue(preset));
        expect(renderResult.getByDisplayValue(preset)).toBeChecked();

        if (result === 'should see') {
          expect(renderResult.getByText(text, { exact: false })).toBeInTheDocument();
        } else {
          expect(
            renderResult.queryByTestId('create-endpoint-policy-license-note')
          ).not.toBeInTheDocument();
        }
      });
    });
  });

  describe('when policy protections are not available', () => {
    let newPolicy: NewPackagePolicy;
    let onChange: PackagePolicyCreateExtensionComponentProps['onChange'];
    let render: () => ReturnType<AppContextTestRender['render']>;

    beforeEach(() => {
      mockedContext.startServices.upselling.setSections({
        endpointPolicyProtections: () => <div data-test-subj="paywall">{'pay up!'}</div>,
      });
      newPolicy = getMockNewPackage();
      onChange = jest.fn();
      render = () => {
        renderResult = mockedContext.render(
          <EndpointPolicyCreateExtension newPolicy={newPolicy} onChange={onChange} />
        );
        return renderResult;
      };
    });

    it('should render expected preset for endpoint', () => {
      const { getByTestId } = render();

      expect(getByTestId('endpointDataCollectionOnlyPreset')).toHaveTextContent(
        'Data Collection' +
          'Augment your existing anti-virus solution with advanced data collection and detection' +
          'pay up!'
      );
    });

    it('should set the correct value for preset in policy', () => {
      render();

      expect(onChange).toHaveBeenLastCalledWith({
        isValid: true,
        updatedPolicy: {
          enabled: true,
          id: 'someid',
          inputs: [
            {
              config: {
                _config: {
                  value: {
                    endpointConfig: {
                      preset: 'DataCollection',
                    },
                    type: 'endpoint',
                  },
                },
              },
              enabled: true,
              streams: [],
              type: 'ENDPOINT_INTEGRATION_CONFIG',
            },
          ],
          name: 'someName',
          namespace: 'someNamespace',
          policy_id: 'somePolicyid',
          policy_ids: ['somePolicyid'],
        },
      });
    });

    it('should still be able to select cloud configuration', () => {
      render();
      userEvent.selectOptions(screen.getByTestId('selectIntegrationTypeId'), ['cloud']);

      expect(onChange).toHaveBeenLastCalledWith({
        isValid: true,
        updatedPolicy: {
          enabled: true,
          id: 'someid',
          inputs: [
            {
              config: {
                _config: {
                  value: {
                    eventFilters: {
                      nonInteractiveSession: true,
                    },
                    type: 'cloud',
                  },
                },
              },
              enabled: true,
              streams: [
                {
                  data_stream: {
                    dataset: 'someDataset',
                    type: 'someType',
                  },
                  enabled: true,
                },
              ],
              type: 'someType',
            },
          ],
          name: 'someName',
          namespace: 'someNamespace',
          policy_id: 'somePolicyid',
          policy_ids: ['somePolicyid'],
        },
      });
    });
  });
});
