/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssigneesUserAction } from './assignees';
import type { ActionTypes } from './common';
import type { ConnectorUserActionPayload } from './connector';
import type { DescriptionUserAction } from './description';
import type { SettingsUserAction } from './settings';
import type { SeverityUserAction } from './severity';
import type { StatusUserAction } from './status';
import type { TagsUserAction } from './tags';
import type { TitleUserAction } from './title';

interface CommonPayload {
  assignees: AssigneesUserAction['payload']['assignees'];
  description: DescriptionUserAction['payload']['description'];
  status: StatusUserAction['payload']['status'];
  severity: SeverityUserAction['payload']['severity'];
  tags: TagsUserAction['payload']['tags'];
  title: TitleUserAction['payload']['title'];
  settings: SettingsUserAction['payload']['settings'];
  owner: string;
}

export interface CreateCaseUserAction {
  type: typeof ActionTypes.create_case;
  payload: ConnectorUserActionPayload & CommonPayload;
}
