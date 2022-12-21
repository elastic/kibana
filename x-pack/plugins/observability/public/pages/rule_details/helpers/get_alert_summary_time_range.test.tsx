/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { getDefaultAlertSummaryTimeRange } from '.';

describe('getDefaultAlertSummaryTimeRange', () => {
  it('should return default time in UTC format', () => {
    const defaultTimeRange = getDefaultAlertSummaryTimeRange();
    const utcFormat = 'YYYY-MM-DDTHH:mm:ss.SSSZ';

    expect(moment(defaultTimeRange.utcFrom, utcFormat, true).isValid()).toBeTruthy();
    expect(moment(defaultTimeRange.utcTo, utcFormat, true).isValid()).toBeTruthy();
  });
});
