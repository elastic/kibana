/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_THRESHOLD_RESULT } from '../../../../../../common/field_maps/field_names';
import { SignalSourceHit } from '../../../signals/types';
import { RACAlert } from '../../types';

export const filterSource = (doc: SignalSourceHit): Partial<RACAlert> => {
  const docSource = doc._source ?? {};
  const {
    event,
    kibana,
    signal,
    threshold_result: siemSignalsThresholdResult,
    [ALERT_THRESHOLD_RESULT]: alertThresholdResult,
    ...filteredSource
  } = docSource || {
    event: null,
    kibana: null,
    signal: null,
    threshold_result: null,
    [ALERT_THRESHOLD_RESULT]: null,
  };

  return filteredSource;
};
