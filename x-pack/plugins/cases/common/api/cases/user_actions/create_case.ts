/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { Actions, Fields } from './common';
import {
  ConnectorUserActionPayloadRt,
  ConnectorUserActionPayloadWithoutConnectorIdRt,
} from './connector';
import { DescriptionUserActionPayloadRt } from './description';
import { SettingsUserActionPayloadRt } from './settings';
import { TagsUserActionPayloadRt } from './tags';
import { TitleUserActionPayloadRt } from './title';

export const CommonFieldsRt = rt.type({
  fields: rt.array(
    rt.union([
      rt.literal(Fields.description),
      rt.literal(Fields.status),
      rt.literal(Fields.tags),
      rt.literal(Fields.title),
      rt.literal(Fields.connector),
      rt.literal(Fields.settings),
      rt.literal(Fields.owner),
    ])
  ),
  action: rt.literal(Actions.create),
});

const CommonPayloadAttributesRt = rt.type({
  description: DescriptionUserActionPayloadRt.props.description,
  status: rt.string,
  tags: TagsUserActionPayloadRt.props.tags,
  title: TitleUserActionPayloadRt.props.title,
  settings: SettingsUserActionPayloadRt.props.settings,
  owner: rt.string,
});

export const CreateCaseUserActionRt = rt.intersection([
  CommonFieldsRt,
  rt.type({
    payload: rt.intersection([ConnectorUserActionPayloadRt, CommonPayloadAttributesRt]),
  }),
]);

export const CreateCaseUserActionWithoutConnectorIdRt = rt.intersection([
  CommonFieldsRt,
  rt.type({
    payload: rt.intersection([
      ConnectorUserActionPayloadWithoutConnectorIdRt,
      CommonPayloadAttributesRt,
    ]),
  }),
]);

export type CreateCaseUserAction = rt.TypeOf<typeof CreateCaseUserActionRt>;
export type CreateCaseUserActionWithoutConnectorId = rt.TypeOf<
  typeof CreateCaseUserActionWithoutConnectorIdRt
>;
