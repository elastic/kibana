/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Moment } from 'moment';
import { parseRelativeDate } from '../../../common/lib/get_histogram_interval';

describe('Parsing a relative end date properly', () => {
  it('converts the upper range of relative end dates to now', async () => {
    const thisWeekEndDate = 'now/w';

    let endDate = parseRelativeDate(thisWeekEndDate, { roundUp: true });
    expect(Date.now() - (endDate as Moment).valueOf()).toBeLessThan(1000);

    const todayEndDate = 'now/d';

    endDate = parseRelativeDate(todayEndDate, { roundUp: true });

    expect(Date.now() - (endDate as Moment).valueOf()).toBeLessThan(1000);
  });
});
