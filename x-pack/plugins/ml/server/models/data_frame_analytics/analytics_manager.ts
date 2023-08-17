/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IScopedClusterClient } from '@kbn/core/server';
import {
  getAnalysisType,
  INDEX_CREATED_BY,
  JOB_MAP_NODE_TYPES,
  type JobMapNodeTypes,
  type AnalyticsMapEdgeElement,
  type AnalyticsMapReturnType,
  type AnalyticsMapNodeElement,
  type MapElements,
} from '@kbn/ml-data-frame-analytics-utils';
import type { TransformGetTransformTransformSummary } from '@elastic/elasticsearch/lib/api/types';
import { flatten } from 'lodash';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { modelsProvider } from '../model_management';
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
  GetAnalyticsJobIdArg,
  GetAnalyticsModelIdArg,
} from './types';
import type { MlClient } from '../../lib/ml_client';
import { DEFAULT_TRAINED_MODELS_PAGE_SIZE } from '../../routes/trained_models';

export class AnalyticsManager {
  private _trainedModels: estypes.MlTrainedModelConfig[] = [];
  private _jobs: estypes.MlDataframeAnalyticsSummary[] = [];
  private _transforms?: TransformGetTransformTransformSummary[];

  constructor(private _mlClient: MlClient, private _client: IScopedClusterClient) {}

  private async initData() {
    const [models, jobs] = await Promise.all([
      this._mlClient.getTrainedModels({ size: DEFAULT_TRAINED_MODELS_PAGE_SIZE }),
      this._mlClient.getDataFrameAnalytics({ size: 1000 }),
    ]);
    this._trainedModels = models.trained_model_configs;
    this._jobs = jobs.data_frame_analytics;
  }

  private async initTransformData() {
    if (!this._transforms) {
      try {
        const body = await this._client.asCurrentUser.transform.getTransform({
          size: 1000,
        });
        this._transforms = body.transforms;
        return body.transforms;
      } catch (e) {
        if (e.meta?.statusCode !== 403) {
          // eslint-disable-next-line no-console
          console.error(e);
        }
      }
    }
  }

  private getNodeId(
    elementOriginalId: string,
    nodeType: typeof JOB_MAP_NODE_TYPES[keyof typeof JOB_MAP_NODE_TYPES]
  ): string {
    return `${elementOriginalId}-${nodeType}`;
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

  private findJobModel(analyticsId: string, analyticsCreateTime: number): any {
    return this._trainedModels.find(
      (model) =>
        // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
        model.metadata?.analytics_config?.id === analyticsId &&
        // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
        model.metadata?.analytics_config.create_time === analyticsCreateTime
    );
  }

  private findJob(id: string): estypes.MlDataframeAnalyticsSummary {
    const job = this._jobs.find((js) => js.id === id);
    if (job === undefined) {
      throw Error(`No known job with id '${id}'`);
    }
    return job;
  }

  private findTrainedModel(id: string): estypes.MlTrainedModelConfig {
    const trainedModel = this._trainedModels.find((js) => js.model_id === id);
    if (trainedModel === undefined) {
      throw Error(`No known trained model with id '${id}'`);
    }
    return trainedModel;
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
        const jobData = this.findJob(id);
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
    analyticsId: string,
    analyticsCreateTime: number
  ): {
    modelElement?: AnalyticsMapNodeElement;
    modelDetails?: any;
    edgeElement?: AnalyticsMapEdgeElement;
  } {
    // Get trained model for analytics job and create model node
    const analyticsModel = this.findJobModel(analyticsId, analyticsCreateTime);
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
  private async getInitialElementsModelRoot(modelId: string): Promise<InitialElementsReturnType> {
    const resultElements = [];
    const modelElements = [];
    const details: any = {};
    let data: estypes.MlTrainedModelConfig | estypes.MlDataframeAnalyticsSummary;
    // fetch model data and create model elements
    data = this.findTrainedModel(modelId);
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
        data = this.findJob(sourceJobId);

        nextLinkId = data?.source?.index[0];
        nextType = JOB_MAP_NODE_TYPES.INDEX;

        previousNodeId = `${data.id}-${JOB_MAP_NODE_TYPES.ANALYTICS}`;

        resultElements.push({
          data: {
            id: previousNodeId,
            label: data.id,
            type: JOB_MAP_NODE_TYPES.ANALYTICS,
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
  private async getInitialElementsJobRoot(
    jobId: string,
    jobCreateTime: number
  ): Promise<InitialElementsReturnType> {
    const resultElements = [];
    const modelElements = [];
    const details: any = {};
    const data = this.findJob(jobId);

    const nextLinkId = data?.source?.index[0];
    const nextType: JobMapNodeTypes = JOB_MAP_NODE_TYPES.INDEX;

    const previousNodeId = `${data.id}-${JOB_MAP_NODE_TYPES.ANALYTICS}`;

    resultElements.push({
      data: {
        id: previousNodeId,
        label: data.id,
        type: JOB_MAP_NODE_TYPES.ANALYTICS,
        analysisType: getAnalysisType(data?.analysis),
        isRoot: true,
      },
    });

    details[previousNodeId] = data;

    const { modelElement, modelDetails, edgeElement } = this.getAnalyticsModelElements(
      jobId,
      jobCreateTime
    );
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
  private async getAnalyticsMap({
    analyticsId,
    modelId,
  }: GetAnalyticsMapArgs): Promise<AnalyticsMapReturnType> {
    const result: AnalyticsMapReturnType = { elements: [], details: {}, error: null };
    const modelElements: MapElements[] = [];
    const indexPatternElements: MapElements[] = [];

    try {
      await this.initData();
      // Create first node for incoming analyticsId or modelId
      let initialData: InitialElementsReturnType = {} as InitialElementsReturnType;
      const job = analyticsId === undefined ? undefined : this.findJob(analyticsId);
      if (analyticsId !== undefined && job !== undefined) {
        const jobCreateTime = job.create_time!;
        initialData = await this.getInitialElementsJobRoot(analyticsId, jobCreateTime);
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

            // Get trained model for analytics job and create model node
            ({ modelElement, modelDetails, edgeElement } = this.getAnalyticsModelElements(
              data.id,
              data.create_time
            ));
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
          const jobs = this._jobs;
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
              // Get trained model for analytics job and create model node
              ({ modelElement, modelDetails, edgeElement } = this.getAnalyticsModelElements(
                jobs[i].id,
                jobs[i].create_time!
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

  /**
   * Expanded wrapper of getAnalyticsMap, which also handles generic models that are not tied to an analytics job
   * Retrieves info about model and ingest pipeline, index, and transforms associated with the model
   * @param analyticsId
   * @param modelId
   */
  public async extendModelsMap({
    analyticsId,
    modelId,
  }: {
    analyticsId?: string;
    modelId?: string;
  }): Promise<AnalyticsMapReturnType> {
    const result: AnalyticsMapReturnType = {
      elements: [],
      details: {},
      error: null,
    };
    try {
      if (analyticsId && !modelId) {
        return this.getAnalyticsMap({
          analyticsId,
          modelId,
        } as GetAnalyticsJobIdArg);
      }

      await this.initData();

      const modelNodeId = `${modelId}-${JOB_MAP_NODE_TYPES.TRAINED_MODEL}`;
      const model = modelId ? this.findTrainedModel(modelId) : undefined;

      const isDFAModel = isPopulatedObject(model?.metadata, ['analytics_config']);
      if (isDFAModel) {
        return this.getAnalyticsMap({
          analyticsId,
          modelId,
        } as GetAnalyticsModelIdArg);
      }

      if (modelId && model) {
        // First, find information about the trained model
        result.elements.push({
          data: {
            id: modelNodeId,
            label: modelId,
            type: JOB_MAP_NODE_TYPES.TRAINED_MODEL,
            isRoot: true,
          },
        });
        result.details[modelNodeId] = model;

        let pipelinesResponse;
        let indicesSettings;
        try {
          // Then, find the pipelines that have the trained model set as index.default_pipelines
          pipelinesResponse = await modelsProvider(this._client).getModelsPipelines([modelId]);
        } catch (e) {
          // Possible that the user doesn't have permissions to view ingest pipelines
          // If so, gracefully exit
          if (e.meta?.statusCode !== 403) {
            // eslint-disable-next-line no-console
            console.error(e);
          }

          return result;
        }

        const pipelines = pipelinesResponse?.get(modelId);

        if (pipelines) {
          const pipelineIds = new Set(Object.keys(pipelines));
          for (const pipelineId of pipelineIds) {
            const pipelineNodeId = `${pipelineId}-${JOB_MAP_NODE_TYPES.INGEST_PIPELINE}`;
            result.details[pipelineNodeId] = pipelines[pipelineId];

            result.elements.push({
              data: {
                id: pipelineNodeId,
                label: pipelineId,
                type: JOB_MAP_NODE_TYPES.INGEST_PIPELINE,
              },
            });

            result.elements.push({
              data: {
                id: `${modelNodeId}~${pipelineNodeId}`,
                source: modelNodeId,
                target: pipelineNodeId,
              },
            });
          }
          const pipelineIdsToDestinationIndices: Record<string, string[]> = {};

          let indicesPermissions;
          try {
            indicesSettings = await this._client.asInternalUser.indices.getSettings();
            const hasPrivilegesResponse = await this._client.asCurrentUser.security.hasPrivileges({
              index: [
                {
                  names: Object.keys(indicesSettings),
                  privileges: ['read'],
                },
              ],
            });
            indicesPermissions = hasPrivilegesResponse.index;
          } catch (e) {
            // Possible that the user doesn't have permissions to view
            // If so, gracefully exit
            if (e.meta?.statusCode !== 403) {
              // eslint-disable-next-line no-console
              console.error(e);
            }
            return result;
          }

          for (const [indexName, { settings }] of Object.entries(indicesSettings)) {
            if (
              settings?.index?.default_pipeline &&
              pipelineIds.has(settings.index.default_pipeline) &&
              indicesPermissions[indexName]?.read === true
            ) {
              if (Array.isArray(pipelineIdsToDestinationIndices[settings.index.default_pipeline])) {
                pipelineIdsToDestinationIndices[settings.index.default_pipeline].push(indexName);
              } else {
                pipelineIdsToDestinationIndices[settings.index.default_pipeline] = [indexName];
              }
            }
          }

          for (const [pipelineId, indexIds] of Object.entries(pipelineIdsToDestinationIndices)) {
            const pipelineNodeId = this.getNodeId(pipelineId, JOB_MAP_NODE_TYPES.INGEST_PIPELINE);

            for (const destinationIndexId of indexIds) {
              const destinationIndexNodeId = this.getNodeId(
                destinationIndexId,
                JOB_MAP_NODE_TYPES.INDEX
              );

              const destinationIndexDetails = await this.getIndexData(destinationIndexId);
              result.details[destinationIndexNodeId] = {
                ...destinationIndexDetails,
                ml_inference_models: [modelId],
              };

              result.elements.push({
                data: {
                  id: destinationIndexNodeId,
                  label: destinationIndexId,
                  type: JOB_MAP_NODE_TYPES.INDEX,
                },
              });

              result.elements.push({
                data: {
                  id: `${pipelineNodeId}~${destinationIndexNodeId}`,
                  source: pipelineNodeId,
                  target: destinationIndexNodeId,
                },
              });
            }
          }

          const destinationIndices = flatten(Object.values(pipelineIdsToDestinationIndices));

          // From these destination indices, see if there's any transforms that have the indexId as the source destination index
          if (destinationIndices.length > 0) {
            const transforms = await this.initTransformData();

            if (!transforms) return result;

            for (const destinationIndex of destinationIndices) {
              const destinationIndexNodeId = `${destinationIndex}-${JOB_MAP_NODE_TYPES.INDEX}`;

              const foundTransform = transforms?.find((t) => {
                const transformSourceIndex = Array.isArray(t.source.index)
                  ? t.source.index[0]
                  : t.source.index;
                return transformSourceIndex === destinationIndex;
              });
              if (foundTransform) {
                const transformDestIndex = foundTransform.dest.index;
                const transformNodeId = `${foundTransform.id}-${JOB_MAP_NODE_TYPES.TRANSFORM}`;
                const transformDestIndexNodeId = `${transformDestIndex}-${JOB_MAP_NODE_TYPES.INDEX}`;

                const destIndex = await this.getIndexData(transformDestIndex);
                result.details[transformNodeId] = foundTransform;
                result.details[transformDestIndexNodeId] = destIndex;

                result.elements.push(
                  {
                    data: {
                      id: transformNodeId,
                      label: foundTransform.id,
                      type: JOB_MAP_NODE_TYPES.TRANSFORM,
                    },
                  },
                  {
                    data: {
                      id: transformDestIndexNodeId,
                      label: transformDestIndex,
                      type: JOB_MAP_NODE_TYPES.INDEX,
                    },
                  }
                );

                result.elements.push(
                  {
                    data: {
                      id: `${destinationIndexNodeId}~${transformNodeId}`,
                      source: destinationIndexNodeId,
                      target: transformNodeId,
                    },
                  },
                  {
                    data: {
                      id: `${transformNodeId}~${transformDestIndexNodeId}`,
                      source: transformNodeId,
                      target: transformDestIndexNodeId,
                    },
                  }
                );
              }
            }
          }
        }
      }
    } catch (error) {
      result.error = error.message || 'An error occurred fetching map';
      return result;
    }

    return result;
  }

  public async extendAnalyticsMapForAnalyticsJob({
    analyticsId,
    index,
  }: ExtendAnalyticsMapArgs): Promise<AnalyticsMapReturnType> {
    const result: AnalyticsMapReturnType = { elements: [], details: {}, error: null };
    try {
      await this.initData();
      const jobs = this._jobs;
      let rootIndex;
      let rootIndexNodeId;

      if (analyticsId !== undefined) {
        const jobData = this.findJob(analyticsId);

        const currentJobNodeId = `${jobData.id}-${JOB_MAP_NODE_TYPES.ANALYTICS}`;
        rootIndex = Array.isArray(jobData?.dest?.index)
          ? jobData?.dest?.index[0]
          : jobData?.dest?.index;
        rootIndexNodeId = `${rootIndex}-${JOB_MAP_NODE_TYPES.INDEX}`;

        // Fetch trained model for incoming job id and add node and edge
        const { modelElement, modelDetails, edgeElement } = this.getAnalyticsModelElements(
          analyticsId,
          jobData.create_time!
        );
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

      for (let i = 0; i < jobs.length; i++) {
        if (
          jobs[i]?.source?.index[0] === rootIndex &&
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
