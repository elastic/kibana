/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { screen } from '@testing-library/react';
import { EndpointPolicyCreateExtension } from './endpoint_policy_create_extension';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';

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
        <EndpointPolicyCreateExtension
          newPolicy={{ id: 'someid', inputs:["someInput"] } as NewPackagePolicy}
          onChange={jest.fn()}
        />
      );
      expect(renderResult.getByTestId('selectIntegrationTypeId')).toBeVisible();
      expect(renderResult.queryByText('NGAV')).toBeVisible();
      expect(renderResult.queryByText('EDR Essential')).toBeVisible();
      expect(renderResult.queryByText('EDR Complete')).toBeVisible();
    });

    it('renders EndpointPolicyCreateExtension options correctly (set to Cloud)', async () => {
      renderResult = mockedContext.render(
        <EndpointPolicyCreateExtension
          newPolicy={{ id: 'someid', inputs:["someInput"] } as NewPackagePolicy}
          onChange={jest.fn()}
        />
      );
      userEvent.selectOptions(screen.getByTestId('selectIntegrationTypeId'), ['cloud']);
      expect(renderResult.getByText('Interactive only')).toBeVisible();
      expect(renderResult.getByText('All events')).toBeVisible();
    });

    it('make sure onChange is called when user change environment', async () => {
      const mockedOnChange = jest.fn();
      renderResult = mockedContext.render(
        <EndpointPolicyCreateExtension
          newPolicy={{ id: 'someid', inputs:["someInput"] } as NewPackagePolicy}
          onChange={mockedOnChange}
        />
      );
      expect(mockedOnChange).toHaveBeenCalledTimes(1)
      userEvent.selectOptions(screen.getByTestId('selectIntegrationTypeId'), ['cloud']);
      expect(mockedOnChange).toHaveBeenCalledTimes(2)
    });
  });
});