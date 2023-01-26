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
  };
  return mockNewPackage;
};

describe('Onboarding Component new section', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
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

    it('make sure NGAV is the default value for endpoint environment', async () => {
      renderResult = mockedContext.render(
        <EndpointPolicyCreateExtension newPolicy={getMockNewPackage()} onChange={jest.fn()} />
      );
      expect(renderResult.getByDisplayValue('NGAV')).toBeChecked();
      expect(renderResult.getByDisplayValue('EDREssential')).not.toBeChecked();
      expect(renderResult.getByDisplayValue('EDRComplete')).not.toBeChecked();
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
      it('not enterprise users should see Essential EDR notes', async () => {
        const licenseServiceMock = licenseService as jest.Mocked<typeof licenseService>;

        licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
        licenseServiceMock.isEnterprise.mockReturnValue(false);
        renderResult = mockedContext.render(
          <EndpointPolicyCreateExtension newPolicy={getMockNewPackage()} onChange={jest.fn()} />
        );
        userEvent.click(screen.getByDisplayValue('EDREssential'));
        expect(renderResult.getByDisplayValue('EDREssential')).toBeChecked();
        expect(
          renderResult.getByText(
            'Note: advanced protections require a platinum license, and full response capabilities require an enterprise license.',
            { exact: false }
          )
        ).toBeInTheDocument();
      });

      it('enterprise users should NOT see Essential EDR notes', async () => {
        const licenseServiceMock = licenseService as jest.Mocked<typeof licenseService>;

        licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
        licenseServiceMock.isEnterprise.mockReturnValue(true);
        renderResult = mockedContext.render(
          <EndpointPolicyCreateExtension newPolicy={getMockNewPackage()} onChange={jest.fn()} />
        );
        userEvent.click(screen.getByDisplayValue('EDREssential'));
        expect(renderResult.getByDisplayValue('EDREssential')).toBeChecked();
        expect(
          renderResult.queryByText(
            'Note: advanced protections require a platinum license, and full response capabilities require an enterprise license.',
            { exact: false }
          )
        ).not.toBeInTheDocument();
      });

      it('not enterprise users should see Complete EDR notes', async () => {
        const licenseServiceMock = licenseService as jest.Mocked<typeof licenseService>;

        licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
        licenseServiceMock.isEnterprise.mockReturnValue(false);
        renderResult = mockedContext.render(
          <EndpointPolicyCreateExtension newPolicy={getMockNewPackage()} onChange={jest.fn()} />
        );
        userEvent.click(screen.getByDisplayValue('EDRComplete'));
        expect(renderResult.getByDisplayValue('EDRComplete')).toBeChecked();
        expect(
          renderResult.getByText(
            'Note: advanced protections require a platinum license, and full response capabilities require an enterprise license.',
            { exact: false }
          )
        ).toBeInTheDocument();
      });

      it('enterprise users should NOT see Complete EDR notes', async () => {
        const licenseServiceMock = licenseService as jest.Mocked<typeof licenseService>;

        licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
        licenseServiceMock.isEnterprise.mockReturnValue(true);
        renderResult = mockedContext.render(
          <EndpointPolicyCreateExtension newPolicy={getMockNewPackage()} onChange={jest.fn()} />
        );
        userEvent.click(screen.getByDisplayValue('EDRComplete'));
        expect(renderResult.getByDisplayValue('EDRComplete')).toBeChecked();
        expect(
          renderResult.queryByText(
            'Note: advanced protections require a platinum license, and full response capabilities require an enterprise license.',
            { exact: false }
          )
        ).not.toBeInTheDocument();
      });

      it('below platinum license users should see NGAV notes', async () => {
        const licenseServiceMock = licenseService as jest.Mocked<typeof licenseService>;

        licenseServiceMock.isPlatinumPlus.mockReturnValue(false);
        licenseServiceMock.isEnterprise.mockReturnValue(false);
        renderResult = mockedContext.render(
          <EndpointPolicyCreateExtension newPolicy={getMockNewPackage()} onChange={jest.fn()} />
        );
        expect(
          renderResult.getByText('Note: advanced protections require a platinum license level.', {
            exact: false,
          })
        ).toBeInTheDocument();
      });

      it('platinum license users should not see NGAV notes', async () => {
        const licenseServiceMock = licenseService as jest.Mocked<typeof licenseService>;

        licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
        licenseServiceMock.isEnterprise.mockReturnValue(false);
        renderResult = mockedContext.render(
          <EndpointPolicyCreateExtension newPolicy={getMockNewPackage()} onChange={jest.fn()} />
        );
        expect(
          renderResult.queryByText('Note: advanced protections require a platinum license level.', {
            exact: false,
          })
        ).not.toBeInTheDocument();
      });

      it('any license users should not see DataCollection notes', async () => {
        const licenseServiceMock = licenseService as jest.Mocked<typeof licenseService>;

        licenseServiceMock.isPlatinumPlus.mockReturnValue(false);
        licenseServiceMock.isEnterprise.mockReturnValue(false);
        renderResult = mockedContext.render(
          <EndpointPolicyCreateExtension newPolicy={getMockNewPackage()} onChange={jest.fn()} />
        );
        userEvent.click(screen.getByDisplayValue('DataCollection'));
        expect(renderResult.getByDisplayValue('DataCollection')).toBeChecked();
        expect(
          renderResult.queryByTestId('create-endpoint-policy-license-note')
        ).not.toBeInTheDocument();
      });
    });
  });
});
