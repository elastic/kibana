/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 ** Applying the same logic as:
 ** x-pack/plugins/observability_solution/apm/server/lib/helpers/get_bucket_size/calculate_auto.js
 */
import moment from 'moment';

export const calculateTimeSeriesInterval = (from: string, to: string) => {
  return `${Math.floor(moment(to).diff(moment(from)) / 32)}ms`;
};
