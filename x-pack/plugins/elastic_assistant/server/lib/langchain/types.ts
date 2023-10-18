/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PostActionsConnectorExecuteBodyInputs } from '../../schemas/post_actions_connector_execute';

export type RequestBody = PostActionsConnectorExecuteBodyInputs;

export interface ResponseBody {
  status: string;
  data: string;
  connector_id: string;
}
