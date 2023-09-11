/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClosureType,
  ConfigurationAttributes,
  ActionConnector,
  ActionTypeConnector,
  CaseConnector,
  ConnectorMappingTarget,
  ConnectorMappingSource,
  ConnectorMappingActionType,
} from '../../../common/types/domain';
import type { CaseUser } from '../types';

export type {
  ActionConnector,
  ActionTypeConnector,
  CaseConnector,
  ConnectorMappingActionType,
  ConnectorMappingSource,
  ConnectorMappingTarget,
  ClosureType,
};

export interface CaseConnectorMapping {
  actionType: ConnectorMappingActionType;
  source: ConnectorMappingSource;
  target: string;
}

export interface CaseConfigure {
  id: string;
  closureType: ClosureType;
  connector: ConfigurationAttributes['connector'];
  createdAt: string;
  createdBy: CaseUser;
  error: string | null;
  mappings: CaseConnectorMapping[];
  updatedAt: string;
  updatedBy: CaseUser;
  version: string;
  owner: string;
}
