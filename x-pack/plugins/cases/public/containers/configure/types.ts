/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticUser } from '../types';
import {
  ActionConnector,
  ActionTypeConnector,
  ActionType,
  CaseConnector,
  CaseField,
  CasesConfigure,
  ClosureType,
  ThirdPartyField,
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
