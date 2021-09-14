/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEventTypeSignal } from '../../../signals/build_event_type_signal';
import { SignalSourceHit } from '../../../signals/types';
import { RACAlert } from '../../types';

export const filterSource = (doc: SignalSourceHit): Partial<RACAlert> => {
  const event = buildEventTypeSignal(doc);

  const docSource = doc._source ?? {};
  const { threshold_result: thresholdResult, ...filteredSource } = docSource || {
    threshold_result: null,
  };

  return {
    ...filteredSource,
    event,
  };
};
