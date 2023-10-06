/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

export function getControlledArtifactCutoffDate(): moment.Moment {
    const startingDate = moment('2023-10-01T00:00:00Z').utc();
    const eighteenMonthsAgo = moment.utc().subtract(18, 'months').add(1, 'day');
    return moment(startingDate).isAfter(eighteenMonthsAgo) ? startingDate : eighteenMonthsAgo;
}