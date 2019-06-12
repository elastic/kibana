/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { dateFormatAliases } from '@elastic/eui/lib/services/format';
import moment from 'moment';

export function formatDate(epochMs: number): string {
  return moment(Number(epochMs)).format(dateFormatAliases.longDateTime);
}
