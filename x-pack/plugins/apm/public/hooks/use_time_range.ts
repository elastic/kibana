/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { useRef } from 'react';
import { getDateRange } from '../context/url_params_context/helpers';

export function useTimeRange({
  rangeFrom,
  rangeTo,
}: {
  rangeFrom: string;
  rangeTo: string;
}) {
  const rangeRef = useRef({ rangeFrom, rangeTo });

  const stateRef = useRef(getDateRange({ state: {}, rangeFrom, rangeTo }));

  const updateParsedTime = () => {
    stateRef.current = getDateRange({ state: {}, rangeFrom, rangeTo });
  };

  if (!isEqual(rangeRef.current, { rangeFrom, rangeTo })) {
    updateParsedTime();
  }

  rangeRef.current = { rangeFrom, rangeTo };

  const { start, end } = stateRef.current;

  if (!start || !end) {
    throw new Error('start and/or end were unexpectedly not set');
  }

  return {
    start,
    end,
  };
}
