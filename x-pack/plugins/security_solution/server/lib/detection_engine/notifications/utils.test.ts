/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNotificationResultsLink } from './utils';

describe('utils', () => {
  it('getNotificationResultsLink', () => {
    const resultLink = getNotificationResultsLink({
      kibanaSiemAppUrl: 'http://localhost:5601/app/security',
      id: 'notification-id',
      from: '00000',
      to: '1111',
    });
    expect(resultLink).toEqual(
      `http://localhost:5601/app/security/detections/rules/id/notification-id?timerange=(global:(linkTo:!(timeline),timerange:(from:00000,kind:absolute,to:1111)),timeline:(linkTo:!(global),timerange:(from:00000,kind:absolute,to:1111)))`
    );
  });
});
