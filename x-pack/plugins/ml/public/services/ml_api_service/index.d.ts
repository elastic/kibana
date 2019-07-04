/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Annotation } from '../../../common/types/annotations';
import { DslName, AggFieldNamePair } from '../../../common/types/fields';

// TODO This is not a complete representation of all methods of `ml.*`.
// It just satisfies needs for other parts of the code area which use
// TypeScript and rely on the methods typed in here.
// This allows the import of `ml` into TypeScript code.
interface EsIndex {
  name: string;
}

declare interface Ml {
  annotations: {
    deleteAnnotation(id: string | undefined): Promise<any>;
    indexAnnotation(annotation: Annotation): Promise<object>;
  };

  dataFrame: {
    getDataFrameTransforms(): Promise<any>;
    getDataFrameTransformsStats(jobId?: string): Promise<any>;
    createDataFrameTransformsJob(jobId: string, jobConfig: any): Promise<any>;
    deleteDataFrameTransformsJob(jobId: string): Promise<any>;
    getDataFrameTransformsPreview(payload: any): Promise<any>;
    startDataFrameTransformsJob(jobId: string): Promise<any>;
    stopDataFrameTransformsJob(jobId: string): Promise<any>;
  };

  checkPrivilege(obj: object): Promise<any>;
  getJobStats(obj: object): Promise<any>;
  getDatafeedStats(obj: object): Promise<any>;
  esSearch(obj: object): any;
  getIndices(): Promise<EsIndex[]>;

  getTimeFieldRange(obj: object): Promise<any>;

  jobs: {
    jobsSummary(jobIds: string[]): Promise<object>;
    jobs(jobIds: string[]): Promise<object>;
    groups(): Promise<object>;
    updateGroups(updatedJobs: string[]): Promise<object>;
    forceStartDatafeeds(datafeedIds: string[], start: string, end: string): Promise<object>;
    stopDatafeeds(datafeedIds: string[]): Promise<object>;
    deleteJobs(jobIds: string[]): Promise<object>;
    closeJobs(jobIds: string[]): Promise<object>;
    jobAuditMessages(jobId: string, from: string): Promise<object>;
    deletingJobTasks(): Promise<object>;
    newJobCaps(indexPatternTitle: string, isRollup: boolean): Promise<object>;
    newJobLineChart(
      indexPatternTitle: string,
      timeField: string,
      start: number,
      end: number,
      intervalMs: number,
      query: object,
      aggFieldNamePairs: AggFieldNamePair[],
      splitFieldName: string | null,
      splitFieldValue: string | null
    ): Promise<any>;
    newJobPopulationsChart(
      indexPatternTitle: string,
      timeField: string,
      start: number,
      end: number,
      intervalMs: number,
      query: object,
      aggFieldNamePairs: AggFieldNamePair[],
      splitFieldName: string
    ): Promise<any>;
    getAllJobAndGroupIds(): Promise<any>;
    getLookBackProgress(
      jobId: string,
      start: number,
      end: number
    ): Promise<{ progress: number; isRunning: boolean }>;
  };
}

declare const ml: Ml;
