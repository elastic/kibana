/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IconColor } from '@elastic/eui';

import { MIGRATION_DEPRECATION_LEVEL as LEVEL } from 'src/core_plugins/elasticsearch';

export const LEVEL_MAP = {
  none: 0,
  info: 1,
  warning: 2,
  critical: 3,
};

export const REVERSE_LEVEL_MAP: { [idx: number]: LEVEL } = _.invert(LEVEL_MAP);

export const COLOR_MAP: { [level: string]: IconColor } = {
  none: 'success',
  info: 'primary',
  warning: 'warning',
  critical: 'danger',
};
