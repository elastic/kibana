/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUrlParams } from '../context/url_params_context/use_url_params';

export function useTimeRange() {
  const {
    urlParams: { start, end },
  } = useUrlParams();

  if (!start || !end) {
    throw new Error('Time range not set');
  }

  return {
    start,
    end,
  };
}
