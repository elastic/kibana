/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, act } from '@testing-library/react';
import * as reactTestingLibrary from '@testing-library/react';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../../common/mock/endpoint';

import { eventFiltersListQueryHttpMock } from '../../../../../event_filters/test_utils';
import { FleetIntegrationArtifactsCard } from './fleet_integration_artifacts_card';
import { EndpointDocGenerator } from '../../../../../../../../common/endpoint/generate_data';
import { getPolicyEventFiltersPath } from '../../../../../../common/routing';
import { PolicyData } from '../../../../../../../../common/endpoint/types';
import { getSummaryExceptionListSchemaMock } from '../../../../../../../../../lists/common/schemas/response/exception_list_summary_schema.mock';
import { EventFiltersApiClient } from '../../../../../event_filters/service/event_filters_api_client';
import { SEARCHABLE_FIELDS } from '../../../../../event_filters/constants';
import { EVENT_FILTERS_LABELS } from '../../endpoint_policy_edit_extension';

const endpointGenerator = new EndpointDocGenerator('seed');

describe('Fleet integration policy endpoint security event filters card', () => {
  let render: (externalPrivileges?: boolean) => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;
  let mockedApi: ReturnType<typeof eventFiltersListQueryHttpMock>;
  let policy: PolicyData;

  beforeEach(() => {
    policy = endpointGenerator.generatePolicyPackagePolicy();
    mockedContext = createAppRootMockRenderer();
    mockedApi = eventFiltersListQueryHttpMock(mockedContext.coreStart.http);
    ({ history } = mockedContext);
    render = async (externalPrivileges = true) => {
      await act(async () => {
        renderResult = mockedContext.render(
          <FleetIntegrationArtifactsCard
            policyId={policy.id}
            artifactApiClientInstance={EventFiltersApiClient.getInstance(
              mockedContext.coreStart.http
            )}
            searchableFields={SEARCHABLE_FIELDS}
            getArtifactsPath={getPolicyEventFiltersPath}
            labels={EVENT_FILTERS_LABELS}
            privileges={externalPrivileges}
            data-test-subj="artifacts"
          />
        );
        await waitFor(() =>
          expect(mockedApi.responseProvider.eventFiltersGetSummary).toHaveBeenCalled()
        );
      });
      return renderResult;
    };

    history.push(getPolicyEventFiltersPath(policy.id));
  });

  afterEach(() => reactTestingLibrary.cleanup());

  it('should call the API and render the card correctly', async () => {
    mockedApi.responseProvider.eventFiltersGetSummary.mockReturnValue(
      getSummaryExceptionListSchemaMock({ total: 3 })
    );

    await render();
    expect(renderResult.getByTestId('artifacts-fleet-integration-card')).toHaveTextContent(
      'Event filters3'
    );
  });

  it('should show the card even when no event filters associated with the policy', async () => {
    mockedApi.responseProvider.eventFiltersGetSummary.mockReturnValue(
      getSummaryExceptionListSchemaMock({ total: 0 })
    );

    await render();
    expect(renderResult.getByTestId('artifacts-fleet-integration-card')).toBeTruthy();
  });

  it('should not show the card when no permissions and no results', async () => {
    mockedApi.responseProvider.eventFiltersGetSummary.mockReturnValue(
      getSummaryExceptionListSchemaMock({ total: 0 })
    );

    await render(false);
    expect(renderResult.queryByTestId('artifacts-fleet-integration-card')).toBeNull();
  });

  it('should show the card when no permissions but results', async () => {
    mockedApi.responseProvider.eventFiltersGetSummary.mockReturnValue(
      getSummaryExceptionListSchemaMock({ total: 1 })
    );

    await render(false);
    expect(renderResult.getByTestId('artifacts-fleet-integration-card')).toBeTruthy();
  });

  it('should have the correct manage event filters link', async () => {
    mockedApi.responseProvider.eventFiltersGetSummary.mockReturnValue(
      getSummaryExceptionListSchemaMock({ total: 1 })
    );

    await render();
    expect(renderResult.getByTestId('artifacts-link-to-exceptions')).toHaveAttribute(
      'href',
      `/app/security/administration/policy/${policy.id}/eventFilters`
    );
  });

  it('should show an error toast when API request fails', async () => {
    const errorMessage = 'Uh oh! API error!';
    const error = new Error(errorMessage);
    mockedApi.responseProvider.eventFiltersGetSummary.mockImplementation(() => {
      throw error;
    });

    await render();
    await waitFor(() => {
      expect(mockedContext.coreStart.notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
      expect(mockedContext.coreStart.notifications.toasts.addDanger).toHaveBeenCalledWith(
        `There was an error trying to fetch event filters stats: "${errorMessage}"`
      );
    });
  });
});
