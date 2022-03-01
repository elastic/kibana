/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { IScopedClusterClient } from 'kibana/server';
import {
  INDEX_CREATED_BY,
  JOB_MAP_NODE_TYPES,
  JobMapNodeTypes,
} from '../../../common/constants/data_frame_analytics';
import { TrainedModelConfigResponse } from '../../../common/types/trained_models';
import {
  AnalyticsMapEdgeElement,
  AnalyticsMapReturnType,
  AnalyticsMapNodeElement,
  DataFrameAnalyticsStats,
  MapElements,
} from '../../../common/types/data_frame_analytics';
import { getAnalysisType } from '../../../common/util/analytics_utils';
import {
  ExtendAnalyticsMapArgs,
  GetAnalyticsMapArgs,
  InitialElementsReturnType,
  isCompleteInitialReturnType,
  isAnalyticsMapEdgeElement,
  isAnalyticsMapNodeElement,
  isIndexPatternLinkReturnType,
  isJobDataLinkReturnType,
  isTransformLinkReturnType,
  NextLinkReturnType,
} from './types';
import type { MlClient } from '../../lib/ml_client';

export class AnalyticsManager {
  private _client: IScopedClusterClient;
  private _mlClient: MlClient;
  private _inferenceModels: TrainedModelConfigResponse[];
  private _jobStats: DataFrameAnalyticsStats[];

  constructor(mlClient: MlClient, client: IScopedClusterClient) {
    this._client = client;
    this._mlClient = mlClient;
    this._inferenceModels = [];
    this._jobStats = [];
  }

  public set jobStats(stats) {
    this._jobStats = stats;
  }

  public get jobStats() {
    return this._jobStats;
  }

  public set inferenceModels(models) {
    this._inferenceModels = models;
  }

  public get inferenceModels() {
    return this._inferenceModels;
  }

  async setInferenceModels() {
    try {
      const models = await this.getAnalyticsModels();
      // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
      this.inferenceModels = models;
    } catch (error) {
      // eslint-disable-next-line
      console.error('Unable to fetch inference models', error);
    }
  }

  async setJobStats() {
    try {
      const jobStats = await this.getAnalyticsStats();
      // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
      this.jobStats = jobStats;
    } catch (error) {
      // eslint-disable-next-line
      console.error('Unable to fetch job stats', error);
    }
  }

  private isDuplicateElement(analyticsId: string, elements: MapElements[]): boolean {
    let isDuplicate = false;
    elements.forEach((elem) => {
      if (
        isAnalyticsMapNodeElement(elem) &&
        elem.data.label === analyticsId &&
        elem.data.type === JOB_MAP_NODE_TYPES.ANALYTICS
      ) {
        isDuplicate = true;
      }
    });
    return isDuplicate;
  }

  private async getAnalyticsModelData(modelId: string) {
    const resp = await this._mlClient.getTrainedModels({
      model_id: modelId,
    });
    const modelData = resp?.trained_model_configs[0];
    return modelData;
  }

  private async getAnalyticsModels() {
    const resp = await this._mlClient.getTrainedModels();
    const models = resp?.trained_model_configs;
    return models;
  }

  private async getAnalyticsStats() {
    const resp = await this._mlClient.getDataFrameAnalyticsStats({ size: 1000 });
    const stats = resp?.data_frame_analytics;
    return stats;
  }

  private async getAnalyticsData(analyticsId?: string) {
    const options = analyticsId
      ? {
          id: analyticsId,
        }
      : undefined;
    const resp = await this._mlClient.getDataFrameAnalytics(options);
    let jobData = analyticsId ? resp?.data_frame_analytics[0] : resp?.data_frame_analytics;

    if (analyticsId !== undefined) {
      const jobStats = this.findJobStats(analyticsId);
      // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
      jobData = { ...jobData, stats: { ...jobStats } };
    } else {
      // @ts-expect-error @elastic-elasticsearch Data frame types incompletes
      jobData = jobData.map((job: any) => {
        const jobStats = this.findJobStats(job.id);
        return { ...job, stats: { ...jobStats } };
      });
    }

    return jobData;
  }

  private async getIndexData(index: string) {
    const indexData = await this._client.asInternalUser.indices.get({
      index,
    });
    return indexData;
  }

  private async getTransformData(transformId: string) {
    const transform = await this._client.asInternalUser.transform.getTransform({
      transform_id: transformId,
    });
    const transformData = transform?.transforms[0];
    return transformData;
  }

  private findJobModel(analyticsId: string): any {
    return this.inferenceModels.find(
      (model) => model.metadata?.analytics_config?.id === analyticsId
    );
  }

  private findJobStats(analyticsId: string): DataFrameAnalyticsStats | undefined {
    return this.jobStats.find((js) => js.id === analyticsId);
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
        const jobData = await this.getAnalyticsData(id);
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

  private getAnalyticsModelElements(analyticsId: string): {
    modelElement?: AnalyticsMapNodeElement;
    modelDetails?: any;
    edgeElement?: AnalyticsMapEdgeElement;
  } {
    // Get inference model for analytics job and create model node
    const analyticsModel = this.findJobModel(analyticsId);
    let modelElement;
    let edgeElement;

    if (analyticsModel !== undefined) {
      const modelId = `${analyticsModel.model_id}-${JOB_MAP_NODE_TYPES.TRAINED_MODEL}`;
      modelElement = {
        data: {
          id: modelId,
          label: analyticsModel.model_id,
          type: JOB_MAP_NODE_TYPES.TRAINED_MODEL,
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
   * Prepares the initial elements for incoming modelId
   * @param modelId
   */
  async getInitialElementsModelRoot(modelId: string): Promise<InitialElementsReturnType> {
    const resultElements = [];
    const modelElements = [];
    const details: any = {};
    // fetch model data and create model elements
    let data = await this.getAnalyticsModelData(modelId);
    const modelNodeId = `${data.model_id}-${JOB_MAP_NODE_TYPES.TRAINED_MODEL}`;
    // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
    const sourceJobId = data?.metadata?.analytics_config?.id;
    let nextLinkId: string | undefined;
    let nextType: JobMapNodeTypes | undefined;
    let previousNodeId: string | undefined;

    modelElements.push({
      data: {
        id: modelNodeId,
        label: data.model_id,
        type: JOB_MAP_NODE_TYPES.TRAINED_MODEL,
        isRoot: true,
      },
    });

    details[modelNodeId] = data;
    // fetch source job data and create elements
    if (sourceJobId !== undefined) {
      try {
        // @ts-expect-error @elastic-elasticsearch Data frame types incompletes
        data = await this.getAnalyticsData(sourceJobId);
        // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
        nextLinkId = data?.source?.index[0];
        nextType = JOB_MAP_NODE_TYPES.INDEX;

        // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
        previousNodeId = `${data.id}-${JOB_MAP_NODE_TYPES.ANALYTICS}`;

        resultElements.push({
          data: {
            id: previousNodeId,
            // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
            label: data.id,
            type: JOB_MAP_NODE_TYPES.ANALYTICS,
            // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
            analysisType: getAnalysisType(data?.analysis),
          },
        });
        // Create edge between job and model
        modelElements.push({
          data: {
            id: `${previousNodeId}~${modelNodeId}`,
            source: previousNodeId,
            target: modelNodeId,
          },
        });

        details[previousNodeId] = data;
      } catch (error) {
        // fail silently if job doesn't exist
        if (error.statusCode !== 404) {
          throw error.body ?? error;
        }
      }
    }

    return { data, details, resultElements, modelElements, nextLinkId, nextType, previousNodeId };
  }

  /**
   * Prepares the initial elements for incoming jobId
   * @param jobId
   */
  async getInitialElementsJobRoot(jobId: string): Promise<InitialElementsReturnType> {
    const resultElements = [];
    const modelElements = [];
    const details: any = {};
    const data = await this.getAnalyticsData(jobId);
    // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
    const nextLinkId = data?.source?.index[0];
    const nextType: JobMapNodeTypes = JOB_MAP_NODE_TYPES.INDEX;

    // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
    const previousNodeId = `${data.id}-${JOB_MAP_NODE_TYPES.ANALYTICS}`;

    resultElements.push({
      data: {
        id: previousNodeId,
        // @ts-expect-error @elastic-elasticsearch Data frame types incompletes
        label: data.id,
        type: JOB_MAP_NODE_TYPES.ANALYTICS,
        // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
        analysisType: getAnalysisType(data?.analysis),
        isRoot: true,
      },
    });

    details[previousNodeId] = data;

    const { modelElement, modelDetails, edgeElement } = this.getAnalyticsModelElements(jobId);
    if (isAnalyticsMapNodeElement(modelElement)) {
      modelElements.push(modelElement);
      details[modelElement.data.id] = modelDetails;
    }
    if (isAnalyticsMapEdgeElement(edgeElement)) {
      modelElements.push(edgeElement);
    }

    return { data, details, resultElements, modelElements, nextLinkId, nextType, previousNodeId };
  }

  /**
   * Works backward from jobId or modelId to return related jobs, indices, models, and transforms
   * @param jobId (optional)
   * @param modelId (optional)
   */
  async getAnalyticsMap({
    analyticsId,
    modelId,
  }: GetAnalyticsMapArgs): Promise<AnalyticsMapReturnType> {
    const result: AnalyticsMapReturnType = { elements: [], details: {}, error: null };
    const modelElements: MapElements[] = [];
    const indexPatternElements: MapElements[] = [];

    try {
      await Promise.all([this.setInferenceModels(), this.setJobStats()]);
      // Create first node for incoming analyticsId or modelId
      let initialData: InitialElementsReturnType = {} as InitialElementsReturnType;
      if (analyticsId !== undefined) {
        initialData = await this.getInitialElementsJobRoot(analyticsId);
      } else if (modelId !== undefined) {
        initialData = await this.getInitialElementsModelRoot(modelId);
      }

      const {
        resultElements,
        details: initialDetails,
        modelElements: initialModelElements,
      } = initialData;

      result.elements.push(...resultElements);
      result.details = initialDetails;
      modelElements.push(...initialModelElements);

      if (isCompleteInitialReturnType(initialData)) {
        let { data, nextLinkId, nextType, previousNodeId } = initialData;

        let complete = false;
        let link: NextLinkReturnType;
        let count = 0;
        let rootTransform;
        let rootIndexPattern;
        let modelElement;
        let modelDetails;
        let edgeElement;

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
              (link.meta === undefined ||
                link.meta?.created_by.includes(INDEX_CREATED_BY.FILE_DATA_VISUALIZER))
            ) {
              rootIndexPattern = nextLinkId;
              complete = true;
              break;
            }

            if (link.meta?.created_by === INDEX_CREATED_BY.DATA_FRAME_ANALYTICS) {
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
          const jobs = await this.getAnalyticsData();
          const comparator = rootTransform !== undefined ? rootTransform : rootIndexPattern;

          // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
          for (let i = 0; i < jobs.length; i++) {
            if (
              // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
              jobs[i]?.source?.index[0] === comparator &&
              // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
              this.isDuplicateElement(jobs[i].id, result.elements) === false
            ) {
              // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
              const nodeId = `${jobs[i].id}-${JOB_MAP_NODE_TYPES.ANALYTICS}`;
              result.elements.push({
                data: {
                  id: nodeId,
                  // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
                  label: jobs[i].id,
                  type: JOB_MAP_NODE_TYPES.ANALYTICS,
                  // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
                  analysisType: getAnalysisType(jobs[i]?.analysis),
                },
              });
              // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
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
                // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
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
      }
      // Include model and index pattern nodes in result elements now that all other nodes have been created
      result.elements.push(...modelElements, ...indexPatternElements);
      return result;
    } catch (error) {
      result.error = error.message || 'An error occurred fetching map';
      return result;
    }
  }

  async extendAnalyticsMapForAnalyticsJob({
    analyticsId,
    index,
  }: ExtendAnalyticsMapArgs): Promise<AnalyticsMapReturnType> {
    const result: AnalyticsMapReturnType = { elements: [], details: {}, error: null };
    try {
      await Promise.all([this.setInferenceModels(), this.setJobStats()]);
      const jobs = await this.getAnalyticsData();
      let rootIndex;
      let rootIndexNodeId;

      if (analyticsId !== undefined) {
        const jobData = await this.getAnalyticsData(analyticsId);
        // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
        const currentJobNodeId = `${jobData.id}-${JOB_MAP_NODE_TYPES.ANALYTICS}`;
        // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
        rootIndex = Array.isArray(jobData?.dest?.index)
          ? // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
            jobData?.dest?.index[0]
          : // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
            jobData?.dest?.index;
        rootIndexNodeId = `${rootIndex}-${JOB_MAP_NODE_TYPES.INDEX}`;

        // Fetch inference model for incoming job id and add node and edge
        const { modelElement, modelDetails, edgeElement } =
          this.getAnalyticsModelElements(analyticsId);
        if (isAnalyticsMapNodeElement(modelElement)) {
          result.elements.push(modelElement);
          result.details[modelElement.data.id] = modelDetails;
        }
        if (isAnalyticsMapEdgeElement(edgeElement)) {
          result.elements.push(edgeElement);
        }

        // If rootIndex node has not been created, create it
        const rootIndexDetails = await this.getIndexData(rootIndex);
        result.elements.push({
          data: {
            id: rootIndexNodeId,
            label: rootIndex,
            type: JOB_MAP_NODE_TYPES.INDEX,
          },
        });
        result.details[rootIndexNodeId] = rootIndexDetails;

        // Connect incoming job to rootIndex
        result.elements.push({
          data: {
            id: `${currentJobNodeId}~${rootIndexNodeId}`,
            source: currentJobNodeId,
            target: rootIndexNodeId,
          },
        });
      } else {
        rootIndex = index;
        rootIndexNodeId = `${rootIndex}-${JOB_MAP_NODE_TYPES.INDEX}`;
      }

      // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
      for (let i = 0; i < jobs.length; i++) {
        if (
          // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
          jobs[i]?.source?.index[0] === rootIndex &&
          // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
          this.isDuplicateElement(jobs[i].id, result.elements) === false
        ) {
          // Create node for associated job
          // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
          const nodeId = `${jobs[i].id}-${JOB_MAP_NODE_TYPES.ANALYTICS}`;
          result.elements.push({
            data: {
              id: nodeId,
              // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
              label: jobs[i].id,
              type: JOB_MAP_NODE_TYPES.ANALYTICS,
              // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
              analysisType: getAnalysisType(jobs[i]?.analysis),
            },
          });
          // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
          result.details[nodeId] = jobs[i];

          result.elements.push({
            data: {
              id: `${rootIndexNodeId}~${nodeId}`,
              source: rootIndexNodeId,
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
