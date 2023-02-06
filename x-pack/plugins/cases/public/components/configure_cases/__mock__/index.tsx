/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeConnector } from '../../../../common/api';
import { ConnectorTypes } from '../../../../common/api';
import type { ActionConnector } from '../../../containers/configure/types';
import type { ReturnUseCaseConfigure } from '../../../containers/configure/use_configure';
import { connectorsMock, actionTypesMock } from '../../../common/mock/connectors';
export { mappings } from '../../../containers/configure/mock';

export const connectors: ActionConnector[] = connectorsMock;
export const actionTypes: ActionTypeConnector[] = actionTypesMock;

export const searchURL =
  '?timerange=(global:(linkTo:!(),timerange:(from:1585487656371,fromStr:now-24h,kind:relative,to:1585574056371,toStr:now)),timeline:(linkTo:!(),timerange:(from:1585227005527,kind:absolute,to:1585313405527)))';

export const useCaseConfigureResponse: ReturnUseCaseConfigure = {
  closureType: 'close-by-user',
  connector: {
    id: 'none',
    name: 'none',
    type: ConnectorTypes.none,
    fields: null,
  },
  currentConfiguration: {
    connector: {
      id: 'none',
      name: 'none',
      type: ConnectorTypes.none,
      fields: null,
    },
    closureType: 'close-by-user',
  },
  firstLoad: false,
  loading: false,
  mappings: [],
  persistCaseConfigure: jest.fn(),
  persistLoading: false,
  refetchCaseConfigure: jest.fn(),
  setClosureType: jest.fn(),
  setConnector: jest.fn(),
  setCurrentConfiguration: jest.fn(),
  setMappings: jest.fn(),
  version: '',
  id: '',
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
