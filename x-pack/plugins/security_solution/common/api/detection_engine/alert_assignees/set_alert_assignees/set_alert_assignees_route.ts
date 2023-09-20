/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { alert_assignee_ids, alert_assignees } from '../../model';

export const setAlertAssigneesRequestBody = t.exact(
  t.type({
    assignees: alert_assignees,
    ids: alert_assignee_ids,
  })
);

export type SetAlertAssigneesRequestBody = t.TypeOf<typeof setAlertAssigneesRequestBody>;
export type SetAlertAssigneesRequestBodyDecoded = SetAlertAssigneesRequestBody;
