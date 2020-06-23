/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticUser } from '../types';
import {
  ActionType,
  CasesConfigurationMaps,
  CaseField,
  ClosureType,
  Connector,
  ThirdPartyField,
} from '../../../../../case/common/api';

export { ActionType, CasesConfigurationMaps, CaseField, ClosureType, Connector, ThirdPartyField };

export interface CasesConfigurationMapping {
  source: CaseField;
  target: ThirdPartyField;
  actionType: ActionType;
}

export interface CaseConfigure {
  createdAt: string;
  createdBy: ElasticUser;
  connectorId: string;
  connectorName: string;
  closureType: ClosureType;
  updatedAt: string;
  updatedBy: ElasticUser;
  version: string;
}

export interface CCMapsCombinedActionAttributes extends CasesConfigurationMaps {
  actionType?: ActionType;
}
