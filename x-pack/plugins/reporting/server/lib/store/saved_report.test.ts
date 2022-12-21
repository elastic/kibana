/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedReport } from '.';

test('SavedReport should succeed if report has ES document fields present', () => {
  const createInstance = () => {
    return new SavedReport({
      _id: '290357209345723095',
      _index: '.reporting-fantastic',
      _seq_no: 23,
      _primary_term: 354000,
      jobtype: 'cool-report',
      payload: {
        headers: '',
        title: '',
        browserTimezone: '',
        objectType: '',
        version: '',
      },
    });
  };
  expect(createInstance).not.toThrow();
});

test('SavedReport should throw an error if report is missing ES document fields', () => {
  const createInstance = () => {
    return new SavedReport({
      jobtype: 'cool-report',
      payload: {
        headers: '',
        title: '',
        browserTimezone: '',
        objectType: '',
        version: '',
      },
    });
  };
  expect(createInstance).toThrowErrorMatchingInlineSnapshot(
    `"Report is not editable: Job [undefined/undefined] is not synced with ES!"`
  );
});
