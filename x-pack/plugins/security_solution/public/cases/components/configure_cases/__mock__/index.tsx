/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Connector } from '../../../containers/configure/types';
import { ReturnConnectors } from '../../../containers/configure/use_connectors';
import { connectorsMock } from '../../../containers/configure/mock';
import { ReturnUseCaseConfigure } from '../../../containers/configure/use_configure';
export { mapping } from '../../../containers/configure/mock';

export const connectors: Connector[] = connectorsMock;

// x - pack / plugins / triggers_actions_ui;
export const searchURL =
  '?timerange=(global:(linkTo:!(),timerange:(from:1585487656371,fromStr:now-24h,kind:relative,to:1585574056371,toStr:now)),timeline:(linkTo:!(),timerange:(from:1585227005527,kind:absolute,to:1585313405527)))';

export const useCaseConfigureResponse: ReturnUseCaseConfigure = {
  closureType: 'close-by-user',
  connectorId: 'none',
  connectorName: 'none',
  currentConfiguration: {
    connectorId: 'none',
    closureType: 'close-by-user',
    connectorName: 'none',
  },
  firstLoad: false,
  loading: false,
  mapping: null,
  persistCaseConfigure: jest.fn(),
  persistLoading: false,
  refetchCaseConfigure: jest.fn(),
  setClosureType: jest.fn(),
  setConnector: jest.fn(),
  setCurrentConfiguration: jest.fn(),
  setMapping: jest.fn(),
  version: '',
};

export const useConnectorsResponse: ReturnConnectors = {
  loading: false,
  connectors,
  refetchConnectors: jest.fn(),
};
