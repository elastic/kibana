/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import _ from 'lodash';

export type callWithRequestType = (action: string, params?: any) => Promise<any>;

export function dataFrameProvider(callWithRequest: callWithRequestType) {
  async function getDataFrameTransformsJobs() {
    try {
      return await callWithRequest('ml.getDataFrameTransforms');
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async function createDataFrameTransformsJob(jobId: string, jobConfig: any) {
    try {
      return await callWithRequest('ml.putDataFrameTranformsJob', { body: jobConfig, jobId });
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async function getDataFrameTransformsPreview(params: any) {
    try {
      return await callWithRequest('ml.getDataFrameTransformsPreview', { body: params });
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async function startDataFrameTransformsJob(jobId: string) {
    try {
      return await callWithRequest('ml.startDataFrameTransformsJob', { jobId });
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async function stopDataFrameTransformsJob(jobId: string) {
    try {
      return await callWithRequest('ml.stopDataFrameTransformsJob', { jobId });
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  return {
    getDataFrameTransformsJobs,
    createDataFrameTransformsJob,
    getDataFrameTransformsPreview,
    startDataFrameTransformsJob,
    stopDataFrameTransformsJob,
  };
}
