/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IconColor } from '@elastic/eui';
import { invert } from 'lodash';

import { DeprecationInfo } from 'src/legacy/core_plugins/elasticsearch';

export const LEVEL_MAP: { [level: string]: number } = {
  warning: 0,
  critical: 1,
};

export const REVERSE_LEVEL_MAP: { [idx: number]: DeprecationInfo['level'] } = invert(
  LEVEL_MAP
) as any;

export const COLOR_MAP: { [level: string]: IconColor } = {
  warning: 'default',
  critical: 'danger',
};
