/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__getFilter } from './do_not_use_find_notifications';
import { __DO_NOT_USE__NOTIFICATIONS_ID } from '../../../../common/constants';

describe('__DO_NOT_USE__find_notifications', () => {
  test('it returns a full filter with an AND if sent down', () => {
    expect(__DO_NOT_USE__getFilter('alert.attributes.enabled: true')).toEqual(
      `alert.attributes.alertTypeId: ${__DO_NOT_USE__NOTIFICATIONS_ID} AND alert.attributes.enabled: true`
    );
  });

  test('it returns existing filter with no AND when not set', () => {
    expect(__DO_NOT_USE__getFilter(null)).toEqual(
      `alert.attributes.alertTypeId: ${__DO_NOT_USE__NOTIFICATIONS_ID}`
    );
  });
});
