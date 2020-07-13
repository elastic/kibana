/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSeverity, severity } from './ml_job_constants';

describe('ml_job_constants', () => {
  describe('getSeverity', () => {
    describe('when score is undefined', () => {
      it('returns undefined', () => {
        expect(getSeverity(undefined)).toEqual(undefined);
      });
    });

    describe('when score < 25', () => {
      it('returns warning', () => {
        expect(getSeverity(10)).toEqual(severity.warning);
      });
    });

    describe('when score is between 25 and 50', () => {
      it('returns minor', () => {
        expect(getSeverity(40)).toEqual(severity.minor);
      });
    });

    describe('when score is between 50 and 75', () => {
      it('returns major', () => {
        expect(getSeverity(60)).toEqual(severity.major);
      });
    });

    describe('when score is 75 or more', () => {
      it('returns critical', () => {
        expect(getSeverity(100)).toEqual(severity.critical);
      });
    });
  });
});
