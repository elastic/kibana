/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { allEvents, defaultOptions, getOptions, rawEvents, alertEvents } from './helpers';

describe('getOptions', () => {
  test(`it returns the default options when 'activeTimelineEventType' is undefined`, () => {
    expect(getOptions()).toEqual(defaultOptions);
  });

  test(`it returns 'allEvents' when 'activeTimelineEventType' is 'all'`, () => {
    expect(getOptions('all')).toEqual(allEvents);
  });

  test(`it returns 'rawEvents' when 'activeTimelineEventType' is 'raw'`, () => {
    expect(getOptions('raw')).toEqual(rawEvents);
  });

  test(`it returns 'alertEvents' when 'activeTimelineEventType' is 'alert'`, () => {
    expect(getOptions('alert')).toEqual(alertEvents);
  });
});
