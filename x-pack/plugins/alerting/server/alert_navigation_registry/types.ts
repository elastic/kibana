/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { JsonObject } from '../../../infra/common/typed_json';
import { DateFromString } from '../../common/date_from_string';
import { AlertType, SanitizedAlert } from '../types';
import { AlertInstance } from '../alert_instance/alert_instance';

const dateRangechema = t.type({
  start: DateFromString,
  end: DateFromString,
});

export const alertNavigationContextSchema = t.type({
  filter: t.string,
  dateRange: dateRangechema,
});

export type AlertNavigationContext = t.TypeOf<typeof alertNavigationContextSchema>;

export type AlertNavigationHandler = (
  alert: SanitizedAlert,
  alertType: AlertType,
  alertInstances?: AlertInstance[],
  context?: AlertNavigationContext
) => JsonObject | string;
