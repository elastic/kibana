/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { showAlert } from './AnomalyDetectionSetupLink';

const dataWithJobs = {
  hasLegacyJobs: false,
  jobs: [
    { job_id: 'job1', environment: 'staging' },
    { job_id: 'job2', environment: 'production' },
  ],
};
const dataWithoutJobs = ({ jobs: [] } as unknown) as any;

describe('#showAlert', () => {
  describe('when an environment is selected', () => {
    it('should return true when there are no jobs', () => {
      const result = showAlert(dataWithoutJobs, 'testing');
      expect(result).toBe(true);
    });
    it('should return true when environment is not included in the jobs', () => {
      const result = showAlert(dataWithJobs, 'testing');
      expect(result).toBe(true);
    });
    it('should return false when environment is included in the jobs', () => {
      const result = showAlert(dataWithJobs, 'staging');
      expect(result).toBe(false);
    });
  });

  describe('there is no environment selected (All)', () => {
    it('should return true when there are no jobs', () => {
      const result = showAlert(dataWithoutJobs, undefined);
      expect(result).toBe(true);
    });
    it('should return false when there are any number of jobs', () => {
      const result = showAlert(dataWithJobs, undefined);
      expect(result).toBe(false);
    });
  });

  describe('when a known error occurred', () => {
    it('should return false', () => {
      const data = ({
        errorCode: 'MISSING_READ_PRIVILEGES',
      } as unknown) as any;
      const result = showAlert(data, undefined);
      expect(result).toBe(false);
    });
  });
});
