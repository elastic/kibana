/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as rt from 'io-ts';
import { ServiceConnectorBasicCaseParamsRt } from '../cases';
import { ElasticUser } from '../../../../security_solution/public/cases/containers/types';
import { ExecutorSubActionPushParams } from '../../../../actions/server/builtin_action_types/jira/types';
import { CaseConnectorMapping } from '../../../../security_solution/public/cases/containers/configure/types';

const ActionTypeRT = rt.union([
  rt.literal('append'),
  rt.literal('nothing'),
  rt.literal('overwrite'),
]);
const CaseFieldRT = rt.union([
  rt.literal('title'),
  rt.literal('description'),
  rt.literal('comments'),
]);
const ThirdPartyFieldRT = rt.union([rt.string, rt.literal('not_mapped')]);
export type ActionType = rt.TypeOf<typeof ActionTypeRT>;
export type CaseField = rt.TypeOf<typeof CaseFieldRT>;
export type ThirdPartyField = rt.TypeOf<typeof ThirdPartyFieldRT>;

export const ConnectorMappingsAttributesRT = rt.type({
  source: CaseFieldRT,
  target: ThirdPartyFieldRT,
  action_type: ActionTypeRT,
});
export const ConnectorMappingsRt = rt.type({
  mappings: rt.array(ConnectorMappingsAttributesRT),
});
export type ConnectorMappingsAttributes = rt.TypeOf<typeof ConnectorMappingsAttributesRT>;
export type ConnectorMappings = rt.TypeOf<typeof ConnectorMappingsRt>;

const FieldTypeRT = rt.union([rt.literal('text'), rt.literal('textarea')]);

const FieldRt = rt.type({
  id: rt.string,
  name: rt.string,
  required: rt.boolean,
  type: FieldTypeRT,
});
export type Field = rt.TypeOf<typeof FieldRt>;
export const ConnectorRequestParamsRt = rt.type({
  connector_id: rt.string,
});
export const GetFieldsRequestQueryRt = rt.type({
  connector_type: rt.string,
});
const GetFieldsResponseRt = rt.type({
  fields: rt.array(FieldRt),
  defaultMappings: rt.array(ConnectorMappingsAttributesRT),
});
export type GetFieldsResponse = rt.TypeOf<typeof GetFieldsResponseRt>;

/////////////////////////////////////////////////////////////////////////////

export const PostPushRequestRt = rt.type({
  mappings: rt.array(ConnectorMappingsAttributesRT),
  params: ServiceConnectorBasicCaseParamsRt,
});

export type ExternalServiceParams = Record<string, unknown>;

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
