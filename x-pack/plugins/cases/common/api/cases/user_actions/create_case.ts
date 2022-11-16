/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { AssigneesUserActionPayloadRt } from './assignees';
import type { UserActionWithAttributes } from './common';
import { ActionTypes } from './common';
import {
  ConnectorUserActionPayloadRt,
  ConnectorUserActionPayloadWithoutConnectorIdRt,
} from './connector';
import { DescriptionUserActionPayloadRt } from './description';
import { SettingsUserActionPayloadRt } from './settings';
import { TagsUserActionPayloadRt } from './tags';
import { TitleUserActionPayloadRt } from './title';

export const CommonFieldsRt = rt.type({
  type: rt.literal(ActionTypes.create_case),
});

const CommonPayloadAttributesRt = rt.type({
  assignees: AssigneesUserActionPayloadRt.props.assignees,
  description: DescriptionUserActionPayloadRt.props.description,
  status: rt.string,
  severity: rt.string,
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

export type CreateCaseUserAction = UserActionWithAttributes<
  rt.TypeOf<typeof CreateCaseUserActionRt>
>;
export type CreateCaseUserActionWithoutConnectorId = UserActionWithAttributes<
  rt.TypeOf<typeof CreateCaseUserActionWithoutConnectorIdRt>
>;
