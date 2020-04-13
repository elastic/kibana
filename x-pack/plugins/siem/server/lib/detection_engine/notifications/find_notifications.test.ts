/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getFilter } from './find_notifications';
import { NOTIFICATIONS_ID } from '../../../../common/constants';

describe('find_notifications', () => {
  test('it returns a full filter with an AND if sent down', () => {
    expect(getFilter('alert.attributes.enabled: true')).toEqual(
      `alert.attributes.alertTypeId: ${NOTIFICATIONS_ID} AND alert.attributes.enabled: true`
    );
  });

  test('it returns existing filter with no AND when not set', () => {
    expect(getFilter(null)).toEqual(`alert.attributes.alertTypeId: ${NOTIFICATIONS_ID}`);
  });
});
