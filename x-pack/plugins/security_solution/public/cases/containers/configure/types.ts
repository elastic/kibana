/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ActionConnector,
  ActionTypeConnector,
  ActionType,
  CaseConnector,
  CaseField,
  CasesConfigure,
  ClosureType,
  ThirdPartyField,
} from 'x-pack/plugins/case/common/api';
import { ElasticUser } from '../types';

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
  closureType: ClosureType;
  connector: CasesConfigure['connector'];
  createdAt: string;
  createdBy: ElasticUser;
  error: string | null;
  mappings: CaseConnectorMapping[];
  updatedAt: string;
  updatedBy: ElasticUser;
  version: string;
}
