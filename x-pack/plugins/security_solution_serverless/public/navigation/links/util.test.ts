/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getProjectFeaturesUrl } from './util';
import type { CloudStart } from '@kbn/cloud-plugin/public';

const cloud = {
  serverless: {
    projectId: '1234',
  },
  projectsUrl: 'https://cloud.elastic.co/projects',
} as CloudStart;

describe('util', () => {
  describe('getProductFeaturesUrl', () => {
    it('should return undefined if the projectId is not present', () => {
      expect(getProjectFeaturesUrl({ ...cloud, serverless: { projectId: undefined } })).toBe(
        undefined
      );
    });

    it('should return undefined if the projectsUrl is not present', () => {
      expect(getProjectFeaturesUrl({ ...cloud, projectsUrl: undefined })).toBe(undefined);
    });

    it('should return the correct url', () => {
      expect(getProjectFeaturesUrl(cloud)).toBe(
        `${cloud.projectsUrl}/security/${cloud.serverless?.projectId}?open=securityProjectFeatures`
      );
    });
  });
});
