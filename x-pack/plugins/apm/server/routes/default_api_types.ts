/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { isoToEpochRt } from '@kbn/io-ts-utils';

export { environmentRt } from '../../common/environment_rt';

export const rangeRt = t.type({
  start: isoToEpochRt,
  end: isoToEpochRt,
});

export const kueryRt = t.type({ kuery: t.string });
