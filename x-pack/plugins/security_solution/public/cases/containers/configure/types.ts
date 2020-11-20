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
import { ExecutorSubActionPushParams } from '../../../../../actions/server/builtin_action_types/jira/types';

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
export interface PipedField {
  key: string;
  value: string;
  actionType: string;
  pipes: string[];
}
export interface PrepareFieldsForTransformArgs {
  externalCase: Record<string, string>;
  mappings: CaseConnectorMapping[];
  defaultPipes?: string[];
}
export interface EntityInformation {
  createdAt: string;
  createdBy: ElasticUser;
  updatedAt: string;
  updatedBy: ElasticUser;
}
export interface TransformerArgs {
  value: string;
  date?: string;
  user?: string;
  previousValue?: string;
}

export type Transformer = (args: TransformerArgs) => TransformerArgs;
export interface TransformFieldsArgs<P, S> {
  params: P;
  fields: PipedField[];
  currentIncident?: S;
}
export type Incident = Pick<
  ExecutorSubActionPushParams,
  'description' | 'priority' | 'labels' | 'issueType' | 'parent'
> & { summary: string };
