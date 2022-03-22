/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor } from '@testing-library/react';
import React from 'react';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../../common/mock/endpoint';
import { getEventFiltersListPath } from '../../../../../../common/routing';
import { eventFiltersListQueryHttpMock } from '../../../../../event_filters/test_utils';
import { getEndpointPrivilegesInitialStateMock } from '../../../../../../../common/components/user_privileges/endpoint/mocks';
import { useToasts } from '../../../../../../../common/lib/kibana';
import { EventFiltersApiClient } from '../../../../../event_filters/service/event_filters_api_client';
import { FleetArtifactsCard } from './fleet_artifacts_card';
import { EVENT_FILTERS_LABELS } from '..';

jest.mock('../../../../../../../common/lib/kibana');

describe('Fleet artifacts card', () => {
  let render: (externalPrivileges?: boolean) => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let mockedContext: AppContextTestRender;
  let mockedApi: ReturnType<typeof eventFiltersListQueryHttpMock>;
  let addDanger: jest.Mock = jest.fn();
  const useToastsMock = useToasts as jest.Mock;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    mockedApi = eventFiltersListQueryHttpMock(mockedContext.coreStart.http);
    getEndpointPrivilegesInitialStateMock({
      canCreateArtifactsByPolicy: true,
    });
    render = async () => {
      await act(async () => {
        renderResult = mockedContext.render(
          // @ts-expect-error TS2739
          <FleetArtifactsCard
            artifactApiClientInstance={EventFiltersApiClient.getInstance(
              mockedContext.coreStart.http
            )}
            getArtifactsPath={getEventFiltersListPath}
            labels={EVENT_FILTERS_LABELS}
          />
        );
        await waitFor(mockedApi.responseProvider.eventFiltersList);
      });
      return renderResult;
    };
  });

  beforeAll(() => {
    useToastsMock.mockImplementation(() => {
      return {
        addDanger,
      };
    });
  });
  beforeEach(() => {
    addDanger = jest.fn();
  });

  it('should render correctly', async () => {
    const component = await render();
    expect(component.getByText('Event filters')).not.toBeNull();
    expect(component.getByText('Manage')).not.toBeNull();
  });
  it('should render an error toast when api call fails', async () => {
    expect(addDanger).toBeCalledTimes(0);
    mockedApi.responseProvider.eventFiltersGetSummary.mockImplementation(() => {
      throw new Error('error getting summary');
    });
    const component = await render();
    expect(component.getByText('Event filters')).not.toBeNull();
    expect(component.getByText('Manage')).not.toBeNull();
    await waitFor(() => expect(addDanger).toBeCalledTimes(1));
  });
});
