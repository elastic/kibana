/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticUser } from '../types';
import {
  ActionType,
  CaseField,
  ClosureType,
  ThirdPartyField,
  CasesConfigure,
  ActionConnector,
  CaseConnector,
} from '../../../../../case/common/api';

export { ActionType, CaseField, ClosureType, ThirdPartyField, ActionConnector, CaseConnector };

export interface CasesConfigurationMapping {
  source: CaseField;
  target: string;
  actionType: ActionType;
}

export interface CaseConfigure {
  createdAt: string;
  createdBy: ElasticUser;
  connector: CasesConfigure['connector'];
  closureType: ClosureType;
  updatedAt: string;
  updatedBy: ElasticUser;
  version: string;
}
