/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_THRESHOLD_RESULT } from '../../../../../../common/field_maps/field_names';
import type { SignalSourceHit } from '../../types';

export const filterSource = (doc: SignalSourceHit) => {
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

  Object.keys(filteredSource).forEach((key) => {
    if (key.startsWith('kibana')) {
      delete filteredSource[key];
    }
  });

  return filteredSource;
};
