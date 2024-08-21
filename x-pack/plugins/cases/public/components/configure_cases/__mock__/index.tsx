/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockedTestProvidersOwner } from '../../../common/mock';
import type { ActionTypeConnector } from '../../../../common/types/domain';
import { ConnectorTypes } from '../../../../common/types/domain';
import type { ActionConnector } from '../../../containers/configure/types';
import { connectorsMock, actionTypesMock } from '../../../common/mock/connectors';
export { mappings } from '../../../containers/configure/mock';

export const connectors: ActionConnector[] = connectorsMock;
export const actionTypes: ActionTypeConnector[] = actionTypesMock;

export const searchURL =
  '?timerange=(global:(linkTo:!(),timerange:(from:1585487656371,fromStr:now-24h,kind:relative,to:1585574056371,toStr:now)),timeline:(linkTo:!(),timerange:(from:1585227005527,kind:absolute,to:1585313405527)))';

const mockConfigurationData = {
  closureType: 'close-by-user' as const,
  connector: {
    fields: null,
    id: 'none',
    name: 'none',
    type: ConnectorTypes.none,
  },
  customFields: [],
  templates: [],
  mappings: [],
  version: '',
  id: '',
  owner: mockedTestProvidersOwner[0],
};

export const useCaseConfigureResponse = {
  data: mockConfigurationData,
  isLoading: false,
  isFetching: false,
  refetch: jest.fn(),
};

export const useGetAllCaseConfigurationsResponse = {
  data: [mockConfigurationData],
  isLoading: false,
  isFetching: false,
  refetch: jest.fn(),
};

export const usePersistConfigurationMockResponse = {
  isLoading: false,
  mutate: jest.fn(),
  mutateAsync: jest.fn(),
};

export const useConnectorsResponse = {
  isLoading: false,
  data: connectors,
  refetch: jest.fn(),
};

export const useActionTypesResponse = {
  isLoading: false,
  data: actionTypesMock,
  refetch: jest.fn(),
};
