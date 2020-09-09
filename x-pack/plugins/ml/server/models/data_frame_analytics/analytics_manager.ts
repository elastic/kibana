/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { IScopedClusterClient } from 'kibana/server';
import { JOB_MAP_NODE_TYPES } from '../../../public/application/data_frame_analytics/pages/job_map/common'; // eslint-disable-line
import { getAnalysisType } from '../../../public/application/data_frame_analytics/common/analytics'; // eslint-disable-line

// interface NextLinkReturnType {
//   isIndexPattern?: boolean;
//   indexData?: any;
//   isJob?: boolean;
//   jobData?: any;
//   isTransform?: boolean;
//   transformData?: any;
// }
// interface AnalyticsMapReturnType {
//   elements: any[];
//   details: object; // transform, job, or index details
//   error: null | any;
// }
// interface AnalyticsMapElement {
//   id: string;
//   label: string;
//   type: string;
//   analysisType?: string; (job types type)
// }

export class AnalyticsManager {
  private _client: IScopedClusterClient['asInternalUser'];

  constructor(client: IScopedClusterClient['asInternalUser']) {
    this._client = client;
  }

  private isDuplicateElement(analyticsId: string, elements: any[]): boolean {
    let isDuplicate = false;
    elements.forEach((elem: any) => {
      if (elem.data.label === analyticsId && elem.data.type === JOB_MAP_NODE_TYPES.ANALYTICS) {
        isDuplicate = true;
      }
    });
    return isDuplicate;
  }

  private async getAnalyticsModelData(modelId: string) {
    const resp = await this._client.ml.getTrainedModels({
      model_id: modelId,
    });
    const modelData = resp?.body?.trained_model_configs[0];
    return modelData;
  }

  private async getAnalyticsJobData(analyticsId: string) {
    const resp = await this._client.ml.getDataFrameAnalytics({
      id: analyticsId,
    });
    const jobData = resp?.body?.data_frame_analytics[0];
    return jobData;
  }

  private async getIndexData(index: string) {
    const indexData = await this._client.indices.get({
      index,
    });

    return indexData?.body;
  }

  private async getTransformData(transformId: string) {
    const transform = await this._client.transform.getTransform({
      transform_id: transformId,
    });
    const transformData = transform?.body?.transforms[0];
    return transformData;
  }

  private async getNextLink({ id, type }: { id: string; type: JOB_MAP_NODE_TYPES }) {
    try {
      if (type === JOB_MAP_NODE_TYPES.INDEX_PATTERN) {
        // fetch index data
        const indexData = await this.getIndexData(id);
        const meta = indexData[id].mappings._meta;
        return { isIndexPattern: true, indexData, meta };
      } else if (type.includes(JOB_MAP_NODE_TYPES.ANALYTICS)) {
        // fetch job associated with this index
        const jobData = await this.getAnalyticsJobData(id);
        return { jobData, isJob: true };
      } else if (type === JOB_MAP_NODE_TYPES.TRANSFORM) {
        // fetch transform so we can get original index pattern
        const transformData = await this.getTransformData(id);
        return { transformData, isTransform: true };
      }
    } catch (error) {
      throw Boom.badData(error.message ? error.message : error);
    }
  }

  /**
   * Works backward from jobId to return related jobs from source indices
   * @param jobId
   */
  async getAnalyticsMap(analyticsId: string) {
    const result: any = { elements: [], details: {}, error: null };

    try {
      let data = await this.getAnalyticsJobData(analyticsId);
      let nextLinkId = data?.source?.index[0];
      let nextType = JOB_MAP_NODE_TYPES.INDEX_PATTERN;
      let complete = false;
      let link: any = {};
      let count = 0;
      let rootTransform;
      let rootIndexPattern;

      const firstNodeId = `${data.id}-${JOB_MAP_NODE_TYPES.ANALYTICS}`;

      result.elements.push({
        data: {
          id: firstNodeId,
          label: data.id,
          type: JOB_MAP_NODE_TYPES.ANALYTICS,
          analysisType: getAnalysisType(data?.analysis),
        },
      });
      result.details[firstNodeId] = data;
      // Add a safeguard against infinite loops.
      while (complete === false) {
        count++;
        if (count >= 50) {
          break;
        }

        try {
          link = await this.getNextLink({
            id: nextLinkId,
            type: nextType,
          });
        } catch (error) {
          result.error = error.message || 'Something went wrong';
          break;
        }
        // If it's index pattern, check meta data to see what to fetch next
        if (link.isIndexPattern === true) {
          const nodeId = `${nextLinkId}-${JOB_MAP_NODE_TYPES.INDEX_PATTERN}`;
          result.elements.unshift({
            data: { id: nodeId, label: nextLinkId, type: JOB_MAP_NODE_TYPES.INDEX_PATTERN },
          });
          result.details[nodeId] = link.indexData;

          if (link.meta?.created_by === 'data-frame-analytics') {
            nextLinkId = link.meta.analytics;
            nextType = JOB_MAP_NODE_TYPES.ANALYTICS;
          }

          if (link.meta?.created_by === JOB_MAP_NODE_TYPES.TRANSFORM) {
            nextLinkId = link.meta._transform?.transform;
            nextType = JOB_MAP_NODE_TYPES.TRANSFORM;
          }

          // Check meta data
          if (link.meta === undefined) {
            rootIndexPattern = nextLinkId;
            complete = true;
            break;
          }
        } else if (link.isJob === true) {
          data = link.jobData;
          const nodeId = `${data.id}-${JOB_MAP_NODE_TYPES.ANALYTICS}`;

          result.elements.unshift({
            data: {
              id: nodeId,
              label: data.id,
              type: JOB_MAP_NODE_TYPES.ANALYTICS,
              analysisType: getAnalysisType(data?.analysis),
            },
          });
          result.details[nodeId] = data;
          nextLinkId = data?.source?.index[0];
          nextType = JOB_MAP_NODE_TYPES.INDEX_PATTERN;
        } else if (link.isTransform === true) {
          data = link.transformData;

          const nodeId = `${data.id}-${JOB_MAP_NODE_TYPES.TRANSFORM}`;
          rootTransform = data.dest.index;

          result.elements.unshift({
            data: { id: nodeId, label: data.id, type: JOB_MAP_NODE_TYPES.TRANSFORM },
          });
          result.details[nodeId] = data;
          nextLinkId = data?.source?.index[0];
          nextType = JOB_MAP_NODE_TYPES.INDEX_PATTERN;
        }
      } // end while

      // create edge elements
      const elemLength = result.elements.length - 1;
      for (let i = 0; i < elemLength; i++) {
        const currentElem = result.elements[i];
        const nextElem = result.elements[i + 1];
        result.elements.push({
          data: {
            id: `${currentElem.data.id}~${nextElem.data.id}`,
            source: currentElem.data.id,
            target: nextElem.data.id,
          },
        });
      }

      // fetch all jobs associated with root transform if defined, otherwise check root index
      if (rootTransform !== undefined || rootIndexPattern !== undefined) {
        const analyticsJobs = await this._client.ml.getDataFrameAnalytics();
        const jobs = analyticsJobs?.body?.data_frame_analytics || [];
        const comparator = rootTransform !== undefined ? rootTransform : rootIndexPattern;

        for (let i = 0; i < jobs.length; i++) {
          if (
            jobs[i]?.source?.index[0] === comparator &&
            this.isDuplicateElement(jobs[i].id, result.elements) === false
          ) {
            const nodeId = `${jobs[i].id}-${JOB_MAP_NODE_TYPES.ANALYTICS}`;
            result.elements.push({
              data: {
                id: nodeId,
                label: jobs[i].id,
                type: JOB_MAP_NODE_TYPES.ANALYTICS,
                analysisType: getAnalysisType(jobs[i]?.analysis),
              },
            });
            result.details[nodeId] = jobs[i];
            const source = `${comparator}-${JOB_MAP_NODE_TYPES.INDEX_PATTERN}`;
            result.elements.push({
              data: {
                id: `${source}~${nodeId}`,
                source,
                target: nodeId,
              },
            });
          }
        }
      }

      return result;
    } catch (error) {
      result.error = error.message || 'An error occurred fetching map';
      return result;
    }
  }

  async extendAnalyticsMapForAnalyticsJob(analyticsId: string) {
    const result: any = { elements: [], details: {}, error: null };

    try {
      const jobData = await this.getAnalyticsJobData(analyticsId);
      const currentJobNodeId = `${jobData.id}-${JOB_MAP_NODE_TYPES.ANALYTICS}`;
      const destIndex = Array.isArray(jobData?.dest?.index)
        ? jobData?.dest?.index[0]
        : jobData?.dest?.index;
      const destIndexNodeId = `${destIndex}-${JOB_MAP_NODE_TYPES.INDEX_PATTERN}`;
      const analyticsJobs = await this._client.ml.getDataFrameAnalytics();
      const jobs = analyticsJobs?.body?.data_frame_analytics || [];

      // If destIndex node has not been created, create it
      const destIndexDetails = await this.getIndexData(destIndex);
      result.elements.push({
        data: {
          id: destIndexNodeId,
          label: destIndex,
          type: JOB_MAP_NODE_TYPES.INDEX_PATTERN,
        },
      });
      result.details[destIndexNodeId] = destIndexDetails;

      // Connect incoming job to destIndex
      result.elements.push({
        data: {
          id: `${currentJobNodeId}~${destIndexNodeId}`,
          source: currentJobNodeId,
          target: destIndexNodeId,
        },
      });

      for (let i = 0; i < jobs.length; i++) {
        if (
          jobs[i]?.source?.index[0] === destIndex &&
          this.isDuplicateElement(jobs[i].id, result.elements) === false
        ) {
          // Create node for associated job
          const nodeId = `${jobs[i].id}-${JOB_MAP_NODE_TYPES.ANALYTICS}`;
          result.elements.push({
            data: {
              id: nodeId,
              label: jobs[i].id,
              type: JOB_MAP_NODE_TYPES.ANALYTICS,
              analysisType: getAnalysisType(jobs[i]?.analysis),
            },
          });
          result.details[nodeId] = jobs[i];

          result.elements.push({
            data: {
              id: `${destIndexNodeId}~${nodeId}`,
              source: destIndexNodeId,
              target: nodeId,
            },
          });
        }
      }
    } catch (error) {
      result.error = error.message || 'An error occurred fetching map';
      return result;
    }

    return result;
  }
}
