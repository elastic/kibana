/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { unwrapPromise, asOk, asErr } from './result_type';

describe(`Result`, () => {
  describe(`unwrapPromise`, () => {
    test(`unwraps OKs from the result`, async () => {
      const uniqueId = uuid.v4();
      expect(await unwrapPromise(Promise.resolve(asOk(uniqueId)))).toEqual(uniqueId);
    });

    test(`unwraps Errs from the result`, async () => {
      const uniqueId = uuid.v4();
      expect(unwrapPromise(Promise.resolve(asErr(uniqueId)))).rejects.toEqual(uniqueId);
    });

    test(`unwraps Errs from the result when promise rejects`, async () => {
      const uniqueId = uuid.v4();
      expect(unwrapPromise(Promise.reject(asErr(uniqueId)))).rejects.toEqual(uniqueId);
    });
  });
});
