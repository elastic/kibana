/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleNotifyWhen } from '../constants';

export const notifyWhenSchema = schema.oneOf([
  schema.literal(ruleNotifyWhen.CHANGE),
  schema.literal(ruleNotifyWhen.ACTIVE),
  schema.literal(ruleNotifyWhen.THROTTLE),
]);
