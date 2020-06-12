/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { parseAbsoluteDate } from '../lib/helper/url_params/parse_absolute_date';

export const useAbsoluteDate = (relativeDate: string) =>
  useMemo(() => parseAbsoluteDate(relativeDate, 0), [relativeDate]);
