/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_ACTION_GROUP, ALERT_ID } from '@kbn/rule-data-utils';
import { Alert } from '../../common/alert_schema/schemas/alert_schema';

export type ReportedAlert = Pick<Alert, typeof ALERT_ACTION_GROUP | typeof ALERT_ID> &
  Partial<Omit<Alert, typeof ALERT_ACTION_GROUP | typeof ALERT_ID>>;
