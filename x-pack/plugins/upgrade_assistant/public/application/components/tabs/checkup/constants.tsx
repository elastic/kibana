/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IconColor } from '@elastic/eui';
import { invert } from 'lodash';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { DeprecationInfo } from '../../../../../../../../src/core/server/elasticsearch/legacy/api_types';

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
