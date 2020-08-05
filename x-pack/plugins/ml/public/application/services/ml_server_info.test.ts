/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  loadMlServerInfo,
  getCloudDeploymentId,
  isCloud,
  getNewJobDefaults,
  getNewJobLimits,
  extractDeploymentId,
} from './ml_server_info';
import mockMlInfoResponse from './__mocks__/ml_info_response.json';

jest.mock('./ml_api_service', () => ({
  ml: {
    mlInfo: jest.fn(() => Promise.resolve(mockMlInfoResponse)),
  },
}));

describe('ml_server_info initial state', () => {
  it('should fail to get server info ', () => {
    expect(isCloud()).toBe(false);
    expect(getCloudDeploymentId()).toBe(null);
  });
});

describe('ml_server_info', () => {
  beforeEach(async (done) => {
    await loadMlServerInfo();
    done();
  });

  describe('cloud information', () => {
    it('should get could deployment id', () => {
      expect(isCloud()).toBe(true);
      expect(getCloudDeploymentId()).toBe('85d666f3350c469e8c3242d76a7f459c');
    });
  });

  describe('defaults', () => {
    it('should get defaults', async (done) => {
      const defaults = getNewJobDefaults();

      expect(defaults.anomaly_detectors.model_memory_limit).toBe('128mb');
      expect(defaults.anomaly_detectors.categorization_examples_limit).toBe(4);
      expect(defaults.anomaly_detectors.model_snapshot_retention_days).toBe(1);
      expect(defaults.datafeeds.scroll_size).toBe(1000);
      done();
    });
  });

  describe('limits', () => {
    it('should get limits', async (done) => {
      const limits = getNewJobLimits();

      expect(limits.max_model_memory_limit).toBe('128mb');
      done();
    });
  });

  describe('cloud extract deployment ID', () => {
    const cloudIdWithDeploymentName =
      'cloud_message_test:ZXUtd2VzdC0yLmF3cy5jbG91ZC5lcy5pbyQ4NWQ2NjZmMzM1MGM0NjllOGMzMjQyZDc2YTdmNDU5YyQxNmI1ZDM2ZGE1Mzk0YjlkYjIyZWJlNDk1OWY1OGQzMg==';

    const cloudIdWithOutDeploymentName =
      ':ZXUtd2VzdC0yLmF3cy5jbG91ZC5lcy5pbyQ4NWQ2NjZmMzM1MGM0NjllOGMzMjQyZDc2YTdmNDU5YyQxNmI1ZDM2ZGE1Mzk0YjlkYjIyZWJlNDk1OWY1OGQzMg==';

    const badCloudId = 'cloud_message_test:this_is_not_a_base64_string';

    it('should extract cloud ID when deployment name is present', () => {
      expect(extractDeploymentId(cloudIdWithDeploymentName)).toBe(
        '85d666f3350c469e8c3242d76a7f459c'
      );
    });

    it('should extract cloud ID when deployment name is not present', () => {
      expect(extractDeploymentId(cloudIdWithOutDeploymentName)).toBe(
        '85d666f3350c469e8c3242d76a7f459c'
      );
    });

    it('should fail to extract cloud ID', () => {
      expect(extractDeploymentId(badCloudId)).toBe(null);
    });
  });
});
