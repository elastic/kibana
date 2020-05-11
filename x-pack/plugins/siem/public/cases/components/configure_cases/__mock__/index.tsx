/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Connector } from '../../../../../containers/case/configure/types';
import { ReturnConnectors } from '../../../../../containers/case/configure/use_connectors';
import { connectorsMock } from '../../../../../containers/case/configure/mock';
import { ReturnUseCaseConfigure } from '../../../../../containers/case/configure/use_configure';
import { createUseKibanaMock } from '../../../../../mock/kibana_react';
export { mapping } from '../../../../../containers/case/configure/mock';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { actionTypeRegistryMock } from '../../../../../../../triggers_actions_ui/public/application/action_type_registry.mock';

export const connectors: Connector[] = connectorsMock;

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

export const kibanaMockImplementationArgs = {
  services: {
    ...createUseKibanaMock()().services,
    triggers_actions_ui: { actionTypeRegistry: actionTypeRegistryMock.create() },
  },
};
