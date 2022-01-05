/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import uuid from 'uuid';
import { waitFor } from '@testing-library/react';
import * as reactTestingLibrary from '@testing-library/react';
import { createAppRootMockRenderer } from '../../../../../../../common/mock/endpoint';
import { EventFiltersHttpService } from '../../../../../event_filters/service';
import { FleetIntegrationEventFiltersCard } from './fleet_integration_event_filters_card';

jest.mock('../../../../../event_filters/service');

const EventFiltersHttpServiceMock = EventFiltersHttpService as jest.Mock;

describe('Fleet integration policy endpoint security event filters card', () => {
  const policyId = uuid.v4();
  const mockedContext = createAppRootMockRenderer();
  const renderComponent = () => {
    return mockedContext.render(<FleetIntegrationEventFiltersCard policyId={policyId} />);
  };
  afterEach(() => reactTestingLibrary.cleanup());

  it('should call the API and render the card correctly', async () => {
    EventFiltersHttpServiceMock.mockImplementation(() => {
      return {
        getList: () => ({
          total: 3,
        }),
      };
    });
    const renderResult = renderComponent();

    await waitFor(() => {
      expect(EventFiltersHttpServiceMock).toHaveBeenCalled();
    });
    expect(renderResult.getByTestId('eventFilters-fleet-integration-card')).toHaveTextContent(
      'Event filters3'
    );
  });

  it('should show the card even when no event filters associated with the policy', async () => {
    EventFiltersHttpServiceMock.mockImplementation(() => {
      return {
        getList: () => ({
          total: 0,
        }),
      };
    });
    const renderResult = renderComponent();

    await waitFor(() => {
      expect(EventFiltersHttpServiceMock).toHaveBeenCalled();
    });
    expect(renderResult.getByTestId('eventFilters-fleet-integration-card')).toBeTruthy();
  });

  it('should have the correct manage event filters link', async () => {
    EventFiltersHttpServiceMock.mockImplementation(() => {
      return {
        getList: () => ({
          total: 1,
        }),
      };
    });
    const renderResult = renderComponent();

    expect(renderResult.getByTestId('eventFilters-link-to-exceptions')).toHaveAttribute(
      'href',
      `/app/security/administration/policy/${policyId}/eventFilters`
    );
  });
});
