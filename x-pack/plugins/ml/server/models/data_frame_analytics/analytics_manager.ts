/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { IScopedClusterClient } from 'kibana/server';
import {
  JOB_MAP_NODE_TYPES,
  JobMapNodeTypes,
} from '../../../common/constants/data_frame_analytics';
import { INDEX_META_DATA_CREATED_BY } from '../../../common/constants/file_datavisualizer';
import { getAnalysisType } from '../../../common/util/analytics_utils';
import {
  AnalyticsMapEdgeElement,
  AnalyticsMapReturnType,
  AnalyticsMapNodeElement,
  isAnalyticsMapEdgeElement,
  isAnalyticsMapNodeElement,
  isIndexPatternLinkReturnType,
  isJobDataLinkReturnType,
  isTransformLinkReturnType,
  MapElements,
  NextLinkReturnType,
} from './types';
import type { MlClient } from '../../lib/ml_client';

export class AnalyticsManager {
  private _client: IScopedClusterClient['asInternalUser'];
  private _mlClient: MlClient;
  public _inferenceModels: any; // TODO: update types

  constructor(mlClient: MlClient, client: IScopedClusterClient['asInternalUser']) {
    this._client = client;
    this._mlClient = mlClient;
    this._inferenceModels = [];
  }

  public set inferenceModels(models: any) {
    this._inferenceModels = models;
  }

  public get inferenceModels(): any {
    return this._inferenceModels;
  }

  async setInferenceModels() {
    try {
      const models = await this.getAnalyticsModels();
      this.inferenceModels = models;
    } catch (error) {
      // TODO: bubble up this error?
      // eslint-disable-next-line
      console.error('Unable to fetch inference models', error);
    }
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
  // @ts-ignore // TODO: is this needed?
  private async getAnalyticsModelData(modelId: string) {
    const resp = await this._mlClient.getTrainedModels({
      model_id: modelId,
    });
    const modelData = resp?.body?.trained_model_configs[0];
    return modelData;
  }

  private async getAnalyticsModels() {
    const resp = await this._mlClient.getTrainedModels();
    const models = resp?.body?.trained_model_configs;
    return models;
  }

  private async getAnalyticsJobData(analyticsId: string) {
    const resp = await this._mlClient.getDataFrameAnalytics({
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

  private findJobModel(analyticsId: string): any {
    return this.inferenceModels.find(
      (model: any) => model.metadata?.analytics_config?.id === analyticsId
    );
  }

  private async getNextLink({
    id,
    type,
  }: {
    id: string;
    type: JobMapNodeTypes;
  }): Promise<NextLinkReturnType> {
    try {
      if (type === JOB_MAP_NODE_TYPES.INDEX) {
        // fetch index data
        const indexData = await this.getIndexData(id);
        let isWildcardIndexPattern = false;

        if (id.includes('*')) {
          isWildcardIndexPattern = true;
        }
        const meta = indexData[id]?.mappings?._meta;
        return { isWildcardIndexPattern, isIndexPattern: true, indexData, meta };
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

  private getAnalyticsModelElements(
    analyticsId: string
  ): {
    modelElement?: AnalyticsMapNodeElement;
    modelDetails?: any;
    edgeElement?: AnalyticsMapEdgeElement;
  } {
    // Get inference model for analytics job and create model node
    const analyticsModel = this.findJobModel(analyticsId);
    let modelElement;
    let edgeElement;

    if (analyticsModel !== undefined) {
      const modelId = `${analyticsModel.model_id}-${JOB_MAP_NODE_TYPES.INFERENCE_MODEL}`;
      modelElement = {
        data: {
          id: modelId,
          label: analyticsModel.model_id,
          type: JOB_MAP_NODE_TYPES.INFERENCE_MODEL,
        },
      };
      // Create edge for job and corresponding model
      edgeElement = {
        data: {
          id: `${analyticsId}-${JOB_MAP_NODE_TYPES.ANALYTICS}~${modelId}`,
          source: `${analyticsId}-${JOB_MAP_NODE_TYPES.ANALYTICS}`,
          target: modelId,
        },
      };
    }

    return { modelElement, modelDetails: analyticsModel, edgeElement };
  }

  private getIndexPatternElements(indexData: Record<string, object>, previousNodeId: string) {
    const result: any = { elements: [], details: {} };

    Object.keys(indexData).forEach((indexId) => {
      // Create index node
      const nodeId = `${indexId}-${JOB_MAP_NODE_TYPES.INDEX}`;
      result.elements.push({
        data: { id: nodeId, label: indexId, type: JOB_MAP_NODE_TYPES.INDEX },
      });
      result.details[nodeId] = indexData[indexId];

      // create edge node
      result.elements.push({
        data: {
          id: `${previousNodeId}~${nodeId}`,
          source: nodeId,
          target: previousNodeId,
        },
      });
    });

    return result;
  }

  /**
   * Works backward from jobId to return related jobs from source indices
   * @param jobId
   */
  async getAnalyticsMap(analyticsId: string): Promise<AnalyticsMapReturnType> {
    const result: any = { elements: [], details: {}, error: null };
    const modelElements: MapElements[] = [];
    const indexPatternElements: MapElements[] = [];

    try {
      await this.setInferenceModels();
      // Create first node for incoming analyticsId
      let data = await this.getAnalyticsJobData(analyticsId);
      let nextLinkId = data?.source?.index[0];
      let nextType: JobMapNodeTypes = JOB_MAP_NODE_TYPES.INDEX;
      let complete = false;
      let link: NextLinkReturnType;
      let count = 0;
      let rootTransform;
      let rootIndexPattern;

      let previousNodeId = `${data.id}-${JOB_MAP_NODE_TYPES.ANALYTICS}`;

      result.elements.push({
        data: {
          id: previousNodeId,
          label: data.id,
          type: JOB_MAP_NODE_TYPES.ANALYTICS,
          analysisType: getAnalysisType(data?.analysis),
        },
      });
      result.details[previousNodeId] = data;

      let { modelElement, modelDetails, edgeElement } = this.getAnalyticsModelElements(analyticsId);
      if (isAnalyticsMapNodeElement(modelElement)) {
        modelElements.push(modelElement);
        result.details[modelElement.data.id] = modelDetails;
      }
      if (isAnalyticsMapEdgeElement(edgeElement)) {
        modelElements.push(edgeElement);
      }
      // Add a safeguard against infinite loops.
      while (complete === false) {
        count++;
        if (count >= 100) {
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
        if (isIndexPatternLinkReturnType(link) && link.isIndexPattern === true) {
          if (link.isWildcardIndexPattern === true) {
            // Create index nodes for each of the indices included in the index pattern then break
            const { details, elements } = this.getIndexPatternElements(
              link.indexData,
              previousNodeId
            );

            indexPatternElements.push(...elements);
            result.details = { ...result.details, ...details };
            complete = true;
          } else {
            const nodeId = `${nextLinkId}-${JOB_MAP_NODE_TYPES.INDEX}`;
            result.elements.unshift({
              data: { id: nodeId, label: nextLinkId, type: JOB_MAP_NODE_TYPES.INDEX },
            });
            result.details[nodeId] = link.indexData;
          }

          // Check meta data
          if (
            link.isWildcardIndexPattern === false &&
            (link.meta === undefined || link.meta?.created_by === INDEX_META_DATA_CREATED_BY)
          ) {
            rootIndexPattern = nextLinkId;
            complete = true;
            break;
          }

          if (link.meta?.created_by === 'data-frame-analytics') {
            nextLinkId = link.meta.analytics;
            nextType = JOB_MAP_NODE_TYPES.ANALYTICS;
          }

          if (link.meta?.created_by === JOB_MAP_NODE_TYPES.TRANSFORM) {
            nextLinkId = link.meta._transform?.transform;
            nextType = JOB_MAP_NODE_TYPES.TRANSFORM;
          }
        } else if (isJobDataLinkReturnType(link) && link.isJob === true) {
          data = link.jobData;
          const nodeId = `${data.id}-${JOB_MAP_NODE_TYPES.ANALYTICS}`;
          previousNodeId = nodeId;

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
          nextType = JOB_MAP_NODE_TYPES.INDEX;

          // Get inference model for analytics job and create model node
          ({ modelElement, modelDetails, edgeElement } = this.getAnalyticsModelElements(data.id));
          if (isAnalyticsMapNodeElement(modelElement)) {
            modelElements.push(modelElement);
            result.details[modelElement.data.id] = modelDetails;
          }
          if (isAnalyticsMapEdgeElement(edgeElement)) {
            modelElements.push(edgeElement);
          }
        } else if (isTransformLinkReturnType(link) && link.isTransform === true) {
          data = link.transformData;

          const nodeId = `${data.id}-${JOB_MAP_NODE_TYPES.TRANSFORM}`;
          previousNodeId = nodeId;
          rootTransform = data.dest.index;

          result.elements.unshift({
            data: { id: nodeId, label: data.id, type: JOB_MAP_NODE_TYPES.TRANSFORM },
          });
          result.details[nodeId] = data;
          nextLinkId = data?.source?.index[0];
          nextType = JOB_MAP_NODE_TYPES.INDEX;
        }
      } // end while

      // create edge elements
      const elemLength = result.elements.length - 1;
      for (let i = 0; i < elemLength; i++) {
        const currentElem = result.elements[i];
        const nextElem = result.elements[i + 1];
        if (
          currentElem !== undefined &&
          nextElem !== undefined &&
          currentElem?.data?.id.includes('*') === false &&
          nextElem?.data?.id.includes('*') === false
        ) {
          result.elements.push({
            data: {
              id: `${currentElem.data.id}~${nextElem.data.id}`,
              source: currentElem.data.id,
              target: nextElem.data.id,
            },
          });
        }
      }

      // fetch all jobs associated with root transform if defined, otherwise check root index
      if (rootTransform !== undefined || rootIndexPattern !== undefined) {
        const analyticsJobs = await this._mlClient.getDataFrameAnalytics();
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
            const source = `${comparator}-${JOB_MAP_NODE_TYPES.INDEX}`;
            result.elements.push({
              data: {
                id: `${source}~${nodeId}`,
                source,
                target: nodeId,
              },
            });
            // Get inference model for analytics job and create model node
            ({ modelElement, modelDetails, edgeElement } = this.getAnalyticsModelElements(
              jobs[i].id
            ));
            if (isAnalyticsMapNodeElement(modelElement)) {
              modelElements.push(modelElement);
              result.details[modelElement.data.id] = modelDetails;
            }
            if (isAnalyticsMapEdgeElement(edgeElement)) {
              modelElements.push(edgeElement);
            }
          }
        }
      }
      // Include model and index pattern nodes in result elements now that all other nodes have been created
      result.elements.push(...modelElements, ...indexPatternElements);

      return result;
    } catch (error) {
      result.error = error.message || 'An error occurred fetching map';
      return result;
    }
  }

  async extendAnalyticsMapForAnalyticsJob(analyticsId: string): Promise<AnalyticsMapReturnType> {
    const result: any = { elements: [], details: {}, error: null };

    try {
      await this.setInferenceModels();

      const jobData = await this.getAnalyticsJobData(analyticsId);
      const currentJobNodeId = `${jobData.id}-${JOB_MAP_NODE_TYPES.ANALYTICS}`;
      const destIndex = Array.isArray(jobData?.dest?.index)
        ? jobData?.dest?.index[0]
        : jobData?.dest?.index;
      const destIndexNodeId = `${destIndex}-${JOB_MAP_NODE_TYPES.INDEX}`;
      const analyticsJobs = await this._mlClient.getDataFrameAnalytics();
      const jobs = analyticsJobs?.body?.data_frame_analytics || [];

      // Fetch inference model for incoming job id and add node and edge
      const { modelElement, modelDetails, edgeElement } = this.getAnalyticsModelElements(
        analyticsId
      );
      if (isAnalyticsMapNodeElement(modelElement)) {
        result.elements.push(modelElement);
        result.details[modelElement.data.id] = modelDetails;
      }
      if (isAnalyticsMapEdgeElement(edgeElement)) {
        result.elements.push(edgeElement);
      }

      // If destIndex node has not been created, create it
      const destIndexDetails = await this.getIndexData(destIndex);
      result.elements.push({
        data: {
          id: destIndexNodeId,
          label: destIndex,
          type: JOB_MAP_NODE_TYPES.INDEX,
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
