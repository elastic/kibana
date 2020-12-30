/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticUser } from '../types';
import {
  ActionConnector,
  ActionType,
  CaseConnector,
  CaseField,
  CasesConfigure,
  ClosureType,
  ThirdPartyField,
} from '../../../../../case/common/api';

export { ActionConnector, ActionType, CaseConnector, CaseField, ClosureType, ThirdPartyField };

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
  mappings: CaseConnectorMapping[];
  updatedAt: string;
  updatedBy: ElasticUser;
  version: string;
}
