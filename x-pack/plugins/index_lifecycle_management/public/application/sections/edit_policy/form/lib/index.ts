/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SerializedHotPhase } from '../../../../../../common/types';

export const ROLLOVER_DEFAULT: SerializedHotPhase['actions']['rollover'] = {
  max_size: '50gb',
  max_docs: undefined,
  max_age: '30d',
};

export const isUsingDefaultRolloverConfig = (hotPhase?: SerializedHotPhase) =>
  Boolean(
    hotPhase?.actions.rollover?.max_size === '50gb' &&
      hotPhase.actions.rollover.max_age === '50d' &&
      hotPhase.actions.rollover.max_docs === undefined
  );
