/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { Actions, FieldsRt } from './common';
import { ConnectorUserActionPayloadRt } from './connector';
import { DescriptionUserActionPayloadRt } from './description';
import { SettingsUserActionPayloadRt } from './settings';
import { TagsUserActionPayloadRt } from './tags';
import { TitleUserActionPayloadRt } from './title';

export const CreateCaseUserActionRt = rt.type({
  fields: FieldsRt,
  action: rt.literal(Actions.create),
  payload: rt.type({
    description: DescriptionUserActionPayloadRt.props.description,
    status: rt.string,
    tags: TagsUserActionPayloadRt.props.tags,
    title: TitleUserActionPayloadRt.props.title,
    settings: SettingsUserActionPayloadRt.props.settings,
    connector: ConnectorUserActionPayloadRt.props.connector,
    owner: rt.string,
  }),
});

export type CreateCaseUserAction = rt.TypeOf<typeof CreateCaseUserActionRt>;
