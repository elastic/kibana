/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IconColor } from '@elastic/eui';
import { invert } from 'lodash';
import { DeprecationInfo } from '../../../common/types';

export const LEVEL_MAP: { [level: string]: number } = {
  warning: 0,
  critical: 1,
};

interface ReverseLevelMap {
  [idx: number]: DeprecationInfo['level'];
}

export const REVERSE_LEVEL_MAP: ReverseLevelMap = invert(LEVEL_MAP) as ReverseLevelMap;

export const COLOR_MAP: { [level: string]: IconColor } = {
  warning: 'default',
  critical: 'danger',
};

export const DEPRECATIONS_PER_PAGE = 25;
