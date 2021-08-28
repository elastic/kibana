/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CasesConfigure, ClosureType } from '../../../common/api/cases/configure';
import type {
  ActionConnector,
  ActionTypeConnector,
  CaseConnector,
} from '../../../common/api/connectors';
import type {
  ActionType,
  CaseField,
  ThirdPartyField,
} from '../../../common/api/connectors/mappings';
import type { ElasticUser } from '../../../common/ui/types';

export {
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
  connector: CasesConfigure['connector'];
  createdAt: string;
  createdBy: ElasticUser;
  error: string | null;
  mappings: CaseConnectorMapping[];
  updatedAt: string;
  updatedBy: ElasticUser;
  version: string;
  owner: string;
}
