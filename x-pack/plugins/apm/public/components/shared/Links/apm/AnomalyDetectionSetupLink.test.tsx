/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { showAlert } from './AnomalyDetectionSetupLink';

describe('#showAlert', () => {
  describe('when an environment is selected', () => {
    it('should return true when there are no jobs', () => {
      const result = showAlert([], 'testing');
      expect(result).toBe(true);
    });
    it('should return true when environment is not included in the jobs', () => {
      const result = showAlert(
        [{ environment: 'staging' }, { environment: 'production' }],
        'testing'
      );
      expect(result).toBe(true);
    });
    it('should return false when environment is included in the jobs', () => {
      const result = showAlert(
        [{ environment: 'staging' }, { environment: 'production' }],
        'staging'
      );
      expect(result).toBe(false);
    });
  });
  describe('there is no environment selected (All)', () => {
    it('should return true when there are no jobs', () => {
      const result = showAlert([], undefined);
      expect(result).toBe(true);
    });
    it('should return false when there are any number of jobs', () => {
      const result = showAlert(
        [{ environment: 'staging' }, { environment: 'production' }],
        undefined
      );
      expect(result).toBe(false);
    });
  });
});
