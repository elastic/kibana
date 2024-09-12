/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { EntityLink } from '.';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import type { ServiceEntitySummary } from '../../../../context/apm_service/use_service_entity_summary_fetcher';
import * as useServiceEntitySummary from '../../../../context/apm_service/use_service_entity_summary_fetcher';
import type { EntityManagerEnablementContextValue } from '../../../../context/entity_manager_context/entity_manager_context';
import * as useEntityManagerEnablementContext from '../../../../context/entity_manager_context/use_entity_manager_enablement_context';
import * as useFetcher from '../../../../hooks/use_fetcher';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { fromQuery } from '../../../shared/links/url_helpers';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { Redirect } from 'react-router-dom';
import { ApmPluginContextValue } from '../../../../context/apm_plugin/apm_plugin_context';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // Keep other functionality intact
  Redirect: jest.fn(() => <div>Mocked Redirect</div>), // Mock Redirect with a custom implementation
}));

export type HasApmData = APIReturnType<'GET /internal/apm/has_data'>;

const renderEntityLink = ({
  entityManagerMockReturnValue,
  serviceEntitySummaryMockReturnValue,
  hasApmDataFetcherMockReturnValue,
  query = {},
}: {
  entityManagerMockReturnValue: Partial<EntityManagerEnablementContextValue>;
  serviceEntitySummaryMockReturnValue: ReturnType<
    typeof useServiceEntitySummary.useServiceEntitySummaryFetcher
  >;
  hasApmDataFetcherMockReturnValue: { data?: HasApmData; status: FETCH_STATUS };
  query?: {
    rangeFrom?: string;
    rangeTo?: string;
  };
}) => {
  jest
    .spyOn(useEntityManagerEnablementContext, 'useEntityManagerEnablementContext')
    .mockReturnValue(
      entityManagerMockReturnValue as unknown as EntityManagerEnablementContextValue
    );

  jest
    .spyOn(useServiceEntitySummary, 'useServiceEntitySummaryFetcher')
    .mockReturnValue(serviceEntitySummaryMockReturnValue);

  jest.spyOn(useFetcher, 'useFetcher').mockReturnValue({
    ...hasApmDataFetcherMockReturnValue,
    refetch: jest.fn(),
  });

  const history = createMemoryHistory();

  history.replace({
    pathname: '/link-to/entity/foo',
    search: fromQuery(query),
  });

  const { rerender, ...tools } = render(
    <MockApmPluginContextWrapper
      history={history}
      value={
        {
          core: {
            data: {
              query: {
                timefilter: {
                  timefilter: {
                    getTime: () => ({
                      from: 'now-24h',
                      to: 'now',
                    }),
                  },
                },
              },
            },
          },
        } as unknown as ApmPluginContextValue
      }
    >
      <EntityLink />
    </MockApmPluginContextWrapper>
  );
  return { rerender, ...tools };
};

describe('Entity link', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders a loading spinner while fetching data', () => {
    renderEntityLink({
      entityManagerMockReturnValue: {
        isEntityCentricExperienceViewEnabled: undefined,
        entityManagerEnablementStatus: FETCH_STATUS.LOADING,
      },
      serviceEntitySummaryMockReturnValue: {
        serviceEntitySummary: undefined,
        serviceEntitySummaryStatus: FETCH_STATUS.LOADING,
      },
      hasApmDataFetcherMockReturnValue: {
        data: undefined,
        status: FETCH_STATUS.LOADING,
      },
    });
    expect(screen.queryByTestId('apmEntityLinkLoadingSpinner')).toBeInTheDocument();
  });

  it('renders EEM callout when EEM is enabled but service is not found on EEM indices', () => {
    renderEntityLink({
      entityManagerMockReturnValue: {
        isEntityCentricExperienceViewEnabled: true,
        entityManagerEnablementStatus: FETCH_STATUS.SUCCESS,
      },
      serviceEntitySummaryMockReturnValue: {
        serviceEntitySummary: undefined,
        serviceEntitySummaryStatus: FETCH_STATUS.SUCCESS,
      },
      hasApmDataFetcherMockReturnValue: {
        data: { hasData: false },
        status: FETCH_STATUS.SUCCESS,
      },
    });

    expect(screen.queryByTestId('apmEntityLinkLoadingSpinner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('apmEntityLinkEEMCallout')).toBeInTheDocument();
  });

  it('renders Service Overview page when EEM is disabled', () => {
    renderEntityLink({
      entityManagerMockReturnValue: {
        isEntityCentricExperienceViewEnabled: false,
        entityManagerEnablementStatus: FETCH_STATUS.SUCCESS,
      },
      serviceEntitySummaryMockReturnValue: {
        serviceEntitySummary: undefined,
        serviceEntitySummaryStatus: FETCH_STATUS.SUCCESS,
      },
      hasApmDataFetcherMockReturnValue: {
        data: { hasData: false },
        status: FETCH_STATUS.SUCCESS,
      },
      query: {
        rangeFrom: 'now-1h',
        rangeTo: 'now',
      },
    });

    expect(screen.queryByTestId('apmEntityLinkLoadingSpinner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('apmEntityLinkEEMCallout')).not.toBeInTheDocument();
    expect(Redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/services/foo/overview?comparisonEnabled=true&environment=ENVIRONMENT_ALL&kuery=&latencyAggregationType=avg&rangeFrom=now-1h&rangeTo=now&serviceGroup=',
      }),
      {}
    );
  });

  it('renders Service Overview page when EEM is enabled but Service is not found on EEM but it has raw APM data', () => {
    renderEntityLink({
      entityManagerMockReturnValue: {
        isEntityCentricExperienceViewEnabled: true,
        entityManagerEnablementStatus: FETCH_STATUS.SUCCESS,
      },
      serviceEntitySummaryMockReturnValue: {
        serviceEntitySummary: undefined,
        serviceEntitySummaryStatus: FETCH_STATUS.SUCCESS,
      },
      hasApmDataFetcherMockReturnValue: {
        data: { hasData: true },
        status: FETCH_STATUS.SUCCESS,
      },
      query: {
        rangeFrom: 'now-1h',
        rangeTo: 'now',
      },
    });

    expect(screen.queryByTestId('apmEntityLinkLoadingSpinner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('apmEntityLinkEEMCallout')).not.toBeInTheDocument();
    expect(Redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/services/foo/overview?comparisonEnabled=true&environment=ENVIRONMENT_ALL&kuery=&latencyAggregationType=avg&rangeFrom=now-1h&rangeTo=now&serviceGroup=',
      }),
      {}
    );
  });

  it('renders Service Overview page when EEM is enabled and Service is found on EEM', () => {
    renderEntityLink({
      entityManagerMockReturnValue: {
        isEntityCentricExperienceViewEnabled: true,
        entityManagerEnablementStatus: FETCH_STATUS.SUCCESS,
      },
      serviceEntitySummaryMockReturnValue: {
        serviceEntitySummary: { dataStreamTypes: ['metrics'] } as unknown as ServiceEntitySummary,
        serviceEntitySummaryStatus: FETCH_STATUS.SUCCESS,
      },
      hasApmDataFetcherMockReturnValue: {
        data: { hasData: true },
        status: FETCH_STATUS.SUCCESS,
      },
      query: {
        rangeFrom: 'now-1h',
        rangeTo: 'now',
      },
    });

    expect(screen.queryByTestId('apmEntityLinkLoadingSpinner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('apmEntityLinkEEMCallout')).not.toBeInTheDocument();
    expect(Redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/services/foo/overview?comparisonEnabled=true&environment=ENVIRONMENT_ALL&kuery=&latencyAggregationType=avg&rangeFrom=now-1h&rangeTo=now&serviceGroup=',
      }),
      {}
    );
  });

  it('renders Service Overview page setting time range from data plugin', () => {
    renderEntityLink({
      entityManagerMockReturnValue: {
        isEntityCentricExperienceViewEnabled: true,
        entityManagerEnablementStatus: FETCH_STATUS.SUCCESS,
      },
      serviceEntitySummaryMockReturnValue: {
        serviceEntitySummary: { dataStreamTypes: ['metrics'] } as unknown as ServiceEntitySummary,
        serviceEntitySummaryStatus: FETCH_STATUS.SUCCESS,
      },
      hasApmDataFetcherMockReturnValue: {
        data: { hasData: true },
        status: FETCH_STATUS.SUCCESS,
      },
    });

    expect(screen.queryByTestId('apmEntityLinkLoadingSpinner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('apmEntityLinkEEMCallout')).not.toBeInTheDocument();
    expect(Redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/services/foo/overview?comparisonEnabled=true&environment=ENVIRONMENT_ALL&kuery=&latencyAggregationType=avg&rangeFrom=now-24h&rangeTo=now&serviceGroup=',
      }),
      {}
    );
  });
});
