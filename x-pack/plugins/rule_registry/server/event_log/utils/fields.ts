/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { DeepPartial } from './utility_types';

export const mergeFields = <TEvent>(
  base: DeepPartial<TEvent>,
  ext1?: DeepPartial<TEvent>,
  ext2?: DeepPartial<TEvent>,
  ext3?: DeepPartial<TEvent>
): DeepPartial<TEvent> => {
  return merge({}, base, ext1 ?? {}, ext2 ?? {}, ext3 ?? {});
};
