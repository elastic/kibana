/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { unwrapPromise, asOk, asErr } from './result_type';

describe(`Result`, () => {
  describe(`unwrapPromise`, () => {
    test(`unwraps OKs from the result`, async () => {
      const uniqueId = uuidv4();
      expect(await unwrapPromise(Promise.resolve(asOk(uniqueId)))).toEqual(uniqueId);
    });

    test(`unwraps Errs from the result`, async () => {
      const uniqueId = uuidv4();
      expect(unwrapPromise(Promise.resolve(asErr(uniqueId)))).rejects.toEqual(uniqueId);
    });

    test(`unwraps Errs from the result when promise rejects`, async () => {
      const uniqueId = uuidv4();
      expect(unwrapPromise(Promise.reject(asErr(uniqueId)))).rejects.toEqual(uniqueId);
    });
  });
});
