/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseUser } from '../types';
import type {
  ActionConnector,
  ActionTypeConnector,
  ActionType,
  CaseConnector,
  CaseField,
  ClosureType,
  ThirdPartyField,
  ConfigurationAttributes,
} from '../../../common/api';

export type {
  ActionConnector,
  ActionTypeConnector,
  ActionType,
  CaseConnector,
  CaseField,
  ClosureType,
  ThirdPartyField,
};

export interface CaseConnectorMapping {
  actionType: ActionType;
  source: CaseField;
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
