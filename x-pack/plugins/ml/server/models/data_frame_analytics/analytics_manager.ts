/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { ILegacyScopedClusterClient } from 'kibana/server';
import { JOB_MAP_NODE_TYPES } from '../../../public/application/data_frame_analytics/pages/job_map/common'; // eslint-disable-line

export class AnalyticsManager {
  private _client: ILegacyScopedClusterClient['callAsInternalUser'];

  constructor(client: any) {
    this._client = client;
  }

  private isDuplicateElement(analyticsId: string, elements: any[]) {
    let isDuplicate = false;
    elements.forEach((elem: any) => {
      if (elem.data.label === analyticsId && elem.data.type === JOB_MAP_NODE_TYPES.ANALYTICS) {
        isDuplicate = true;
      }
    });
    return isDuplicate;
  }

  private async getNextLink(index: string) {
    if (index === undefined) {
      throw Boom.notFound(`Index with the id "${index}" not found`);
    }

    try {
      const sourceResp = await this._client('indices.get', {
        index,
      });

      if (index.includes('*')) {
        return { isIndexPattern: true, indexData: sourceResp };
      } else if (!index.includes('*')) {
        const meta = sourceResp[index].mappings._meta;

        if (meta === undefined) {
          return { isIndexPattern: true, indexData: sourceResp };
        }

        if (meta.created_by === 'data-frame-analytics') {
          // fetch job associated with this index
          const resp = await this._client('ml.getDataFrameAnalytics', {
            analyticsId: meta.analytics,
          });
          const jobData = resp?.data_frame_analytics[0];

          return { jobData, isJob: true };
        } else if (meta.created_by === JOB_MAP_NODE_TYPES.TRANSFORM) {
          // fetch transform so we can get original index pattern
          const transformId = meta._transform?.transform;
          const transform = await this._client('transport.request', {
            path: `/_transform/${transformId}`,
            method: 'GET',
          });
          const transformData = transform?.transforms[0];

          return { transformData, isTransform: true };
        }
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
      const resp = await this._client('ml.getDataFrameAnalytics', {
        analyticsId,
      });
      let data = resp?.data_frame_analytics[0];
      let sourceIndex = data?.source?.index[0];
      let complete = false;
      let link: any = {};
      let count = 0;
      let rootTransform;
      let rootIndexPattern;

      const firstNodeId = `${data.id}-${JOB_MAP_NODE_TYPES.ANALYTICS}`;

      result.elements.push({
        data: { id: firstNodeId, label: data.id, type: JOB_MAP_NODE_TYPES.ANALYTICS },
      });
      result.details[firstNodeId] = data;
      // Add a safeguard against infinite loops.
      while (complete === false) {
        count++;
        if (count >= 50) {
          break;
        }

        try {
          link = await this.getNextLink(sourceIndex);
        } catch (error) {
          result.error = error.message || 'Something went wrong';
          break;
        }

        if (link.isIndexPattern === true) {
          const nodeId = `${sourceIndex}-${JOB_MAP_NODE_TYPES.INDEX_PATTERN}`;
          result.elements.unshift({
            data: { id: nodeId, label: sourceIndex, type: JOB_MAP_NODE_TYPES.INDEX_PATTERN },
          });
          result.details[nodeId] = link.indexData;
          rootIndexPattern = sourceIndex;
          complete = true;
        } else if (link.isJob === true) {
          data = link.jobData;

          const nodeId = `${data.id}-${JOB_MAP_NODE_TYPES.ANALYTICS}`;

          result.elements.unshift({
            data: { id: nodeId, label: data.id, type: JOB_MAP_NODE_TYPES.ANALYTICS },
          });
          result.details[nodeId] = data;
          sourceIndex = data?.source?.index[0];
        } else if (link.isTransform === true) {
          data = link.transformData;

          const nodeId = `${data.id}-${JOB_MAP_NODE_TYPES.TRANSFORM}`;
          rootTransform = data.id;

          result.elements.unshift({
            data: { id: nodeId, label: data.id, type: JOB_MAP_NODE_TYPES.TRANSFORM },
          });
          result.details[nodeId] = data;
          sourceIndex = data?.source?.index[0];
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
        const analyticsJobs = await this._client('ml.getDataFrameAnalytics');
        const jobs = analyticsJobs?.data_frame_analytics || [];
        const comparator = rootTransform !== undefined ? rootTransform : rootIndexPattern;

        for (let i = 0; i < jobs.length; i++) {
          if (
            jobs[i]?.source?.index[0] === comparator &&
            this.isDuplicateElement(jobs[i].id, result.elements) === false
          ) {
            const nodeId = `${jobs[i].id}-${JOB_MAP_NODE_TYPES.ANALYTICS}`;
            result.elements.push({
              data: { id: nodeId, label: jobs[i].id, type: JOB_MAP_NODE_TYPES.ANALYTICS },
            });
            result.details[nodeId] = jobs[i];
            const source = `${comparator}-${
              rootTransform ? JOB_MAP_NODE_TYPES.TRANSFORM : JOB_MAP_NODE_TYPES.INDEX_PATTERN
            }`;
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
      result.error = error.message || 'Something went wrong';
      return result;
    }
  }

  async extendAnalyticsMapForAnalyticsJob(analyticsId: string) {
    const result: any = { elements: [], details: {}, error: null };

    try {
      const resp = await this._client('ml.getDataFrameAnalytics', {
        analyticsId,
      });
      const data = resp?.data_frame_analytics[0];
      const destIndex = Array.isArray(data?.dest?.index) ? data?.dest?.index[0] : data?.dest?.index;

      const analyticsJobs = await this._client('ml.getDataFrameAnalytics');
      const jobs = analyticsJobs?.data_frame_analytics || [];

      for (let i = 0; i < jobs.length; i++) {
        if (
          jobs[i]?.source?.index[0] === destIndex &&
          this.isDuplicateElement(jobs[i].id, result.elements) === false
        ) {
          const nodeId = `${jobs[i].id}-${JOB_MAP_NODE_TYPES.ANALYTICS}`;

          result.elements.push({
            data: { id: nodeId, label: jobs[i].id, type: JOB_MAP_NODE_TYPES.ANALYTICS },
          });
          result.details[nodeId] = jobs[i];
          const source = `${analyticsId}-${JOB_MAP_NODE_TYPES.ANALYTICS}`;

          result.elements.push({
            data: {
              id: `${source}~${nodeId}`,
              source,
              target: nodeId,
            },
          });
        }
      }
    } catch (error) {
      result.error = error.message || 'Something went wrong';
      return result;
    }

    return result;
  }
}
