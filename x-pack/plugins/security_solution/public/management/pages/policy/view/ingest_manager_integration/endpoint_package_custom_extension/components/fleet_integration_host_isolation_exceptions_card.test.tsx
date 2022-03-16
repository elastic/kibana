/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor } from '@testing-library/react';
import React from 'react';
import uuid from 'uuid';
import { createAppRootMockRenderer } from '../../../../../../../common/mock/endpoint';
import { useUserPrivileges } from '../../../../../../../common/components/user_privileges';
import { getHostIsolationExceptionSummary } from '../../../../../host_isolation_exceptions/service';
import { FleetIntegrationHostIsolationExceptionsCard } from './fleet_integration_host_isolation_exceptions_card';

jest.mock('../../../../../host_isolation_exceptions/service');
jest.mock('../../../../../../../common/components/user_privileges');

const getHostIsolationExceptionSummaryMock = getHostIsolationExceptionSummary as jest.Mock;

const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

describe('Fleet host isolation exceptions card filters card', () => {
  const policyId = uuid.v4();
  const mockedContext = createAppRootMockRenderer();
  const renderComponent = () => {
    return mockedContext.render(
      <FleetIntegrationHostIsolationExceptionsCard policyId={policyId} />
    );
  };
  afterEach(() => {
    getHostIsolationExceptionSummaryMock.mockReset();
  });
  describe('With canIsolateHost privileges', () => {
    beforeEach(() => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: {
          canIsolateHost: true,
        },
      });
    });

    it('should call the API and render the card correctly', async () => {
      getHostIsolationExceptionSummaryMock.mockResolvedValue({
        linux: 5,
        macos: 5,
        total: 5,
        windows: 5,
      });
      const renderResult = renderComponent();

      await waitFor(() => {
        expect(getHostIsolationExceptionSummaryMock).toHaveBeenCalledWith(
          mockedContext.coreStart.http,
          `(exception-list-agnostic.attributes.tags:"policy:${policyId}" OR exception-list-agnostic.attributes.tags:"policy:all")`
        );
      });

      expect(
        renderResult.getByTestId('hostIsolationExceptions-fleet-integration-card')
      ).toHaveTextContent('Host isolation exceptions5');
    });
  });

  describe('Without canIsolateHost privileges', () => {
    beforeEach(() => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: {
          canIsolateHost: false,
        },
      });
    });

    it('should not render the card if there are no exceptions associated', async () => {
      getHostIsolationExceptionSummaryMock.mockResolvedValue({
        linux: 0,
        macos: 0,
        total: 0,
        windows: 0,
      });
      const renderResult = renderComponent();

      await waitFor(() => {
        expect(getHostIsolationExceptionSummaryMock).toHaveBeenCalled();
      });

      expect(
        renderResult.queryByTestId('hostIsolationExceptions-fleet-integration-card')
      ).toBeFalsy();
    });

    it('should render the card if there are exceptions associated', async () => {
      getHostIsolationExceptionSummaryMock.mockResolvedValue({
        linux: 1,
        macos: 1,
        total: 1,
        windows: 1,
      });
      const renderResult = renderComponent();

      await waitFor(() => {
        expect(getHostIsolationExceptionSummaryMock).toHaveBeenCalled();
      });

      expect(
        renderResult.queryByTestId('hostIsolationExceptions-fleet-integration-card')
      ).toBeTruthy();
    });
  });
});
