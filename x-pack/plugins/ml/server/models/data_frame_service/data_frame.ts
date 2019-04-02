/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import _ from 'lodash';

export interface IndexAnnotationArgs {
  jobIds: string[];
  earliestMs: number;
  latestMs: number;
  maxAnnotations: number;
}

export interface GetParams {
  index: string;
  size: number;
  body: object;
}

export interface DeleteParams {
  index: string;
  refresh?: string;
  id: string;
}

export type callWithRequestType = (action: string, params: any) => Promise<any>;

export function dataFrameProvider(callWithRequest: callWithRequestType) {
  async function createDataFrameTransformsJob(jobId: string, jobConfig: any) {
    try {
      return await callWithRequest('ml.createDataFrame', { body: jobConfig, jobId });
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async function getDataFrameTransformsPreview(params: any) {
    try {
      return await callWithRequest('ml.dataFramePreview', { body: params });
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async function startDataFrameTransformsJob(jobId: string) {
    try {
      return await callWithRequest('ml.startDataFrame', { jobId });
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  return {
    createDataFrameTransformsJob,
    getDataFrameTransformsPreview,
    startDataFrameTransformsJob,
  };
}
