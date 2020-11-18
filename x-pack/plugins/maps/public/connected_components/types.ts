/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RawValue } from '../../common/constants';
import { IndexPattern } from '../../../../../src/plugins/data/public';

export interface OnSingleValueTriggerParams {
  actionId: string;
  indexPattern?: IndexPattern;
  key: string;
  label: string;
  value: RawValue;
}
