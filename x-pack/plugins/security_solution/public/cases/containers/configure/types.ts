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
  mappings: CasesConfigurationMapping[];
  updatedAt: string;
  updatedBy: ElasticUser;
  version: string;
}
