/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { JOB_MAP_NODE_TYPES, MapElements } from '@kbn/ml-data-frame-analytics-utils';
import { flatten } from 'lodash';
import type { TransformGetTransformTransformSummary } from '@elastic/elasticsearch/lib/api/types';
import { IndexName, IndicesIndexState } from '@elastic/elasticsearch/lib/api/types';
import type {
  IngestPipeline,
  IngestSimulateDocument,
  IngestSimulateRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { PipelineDefinition } from '../../../common/types/trained_models';

export type ModelService = ReturnType<typeof modelsProvider>;
export const modelsProvider = (client: IScopedClusterClient) => new ModelsProvider(client);

interface ModelMapResult {
  ingestPipelines: Map<string, Record<string, PipelineDefinition> | null>;
  indices: Array<Record<IndexName, IndicesIndexState | null>>;
  /**
   * Map elements
   */
  elements: MapElements[];
  /**
   * Transform, job or index details
   */
  details: Record<string, any>;
  /**
   * Error
   */
  error: null | any;
}
export class ModelsProvider {
  private _transforms?: TransformGetTransformTransformSummary[];

  constructor(private _client: IScopedClusterClient) {}

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

  private async getIndexData(index: string): Promise<Record<IndexName, IndicesIndexState | null>> {
    try {
      const indexData = await this._client.asInternalUser.indices.get({
        index,
      });
      return indexData;
    } catch (e) {
      // Possible that the user doesn't have permissions to view
      // If so, gracefully exit
      if (e.meta?.statusCode !== 403) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
      return { [index]: null };
    }
  }
  private getNodeId(
    elementOriginalId: string,
    nodeType: typeof JOB_MAP_NODE_TYPES[keyof typeof JOB_MAP_NODE_TYPES]
  ): string {
    return `${elementOriginalId}-${nodeType}`;
  }

  /**
   * Simulates the effect of the pipeline on given document.
   *
   */
  async simulatePipeline(docs: IngestSimulateDocument[], pipelineConfig: IngestPipeline) {
    const simulateRequest: IngestSimulateRequest = {
      docs,
      pipeline: pipelineConfig,
    };
    let result = {};
    try {
      result = await this._client.asCurrentUser.ingest.simulate(simulateRequest);
    } catch (error) {
      if (error.statusCode === 404) {
        // ES returns 404 when there are no pipelines
        // Instead, we should return an empty response and a 200
        return result;
      }
      throw error;
    }

    return result;
  }

  /**
   * Creates the pipeline
   *
   */
  async createInferencePipeline(pipelineConfig: IngestPipeline, pipelineName: string) {
    let result = {};

    result = await this._client.asCurrentUser.ingest.putPipeline({
      id: pipelineName,
      ...pipelineConfig,
    });

    return result;
  }

  /**
   * Retrieves existing pipelines.
   *
   */
  async getPipelines() {
    let result = {};
    try {
      result = await this._client.asCurrentUser.ingest.getPipeline();
    } catch (error) {
      if (error.statusCode === 404) {
        // ES returns 404 when there are no pipelines
        // Instead, we should return an empty response and a 200
        return result;
      }
      throw error;
    }

    return result;
  }

  /**
   * Retrieves the map of model ids and aliases with associated pipelines.
   * @param modelIds - Array of models ids and model aliases.
   */
  async getModelsPipelines(modelIds: string[]) {
    const modelIdsMap = new Map<string, Record<string, PipelineDefinition> | null>(
      modelIds.map((id: string) => [id, null])
    );

    try {
      const body = await this._client.asCurrentUser.ingest.getPipeline();

      for (const [pipelineName, pipelineDefinition] of Object.entries(body)) {
        const { processors } = pipelineDefinition as { processors: Array<Record<string, any>> };

        for (const processor of processors) {
          const id = processor.inference?.model_id;
          if (modelIdsMap.has(id)) {
            const obj = modelIdsMap.get(id);
            if (obj === null) {
              modelIdsMap.set(id, { [pipelineName]: pipelineDefinition });
            } else {
              obj![pipelineName] = pipelineDefinition;
            }
          }
        }
      }
    } catch (error) {
      if (error.statusCode === 404) {
        // ES returns 404 when there are no pipelines
        // Instead, we should return the modelIdsMap and a 200
        return modelIdsMap;
      }
      throw error;
    }

    return modelIdsMap;
  }

  /**
   * Retrieves the network map and metadata of model ids, pipelines, and indices that are tied to the model ids.
   * @param modelIds - Array of models ids and model aliases.
   */
  async getModelsPipelinesAndIndicesMap(modelId: string): Promise<ModelMapResult> {
    const result: ModelMapResult = {
      ingestPipelines: new Map(),
      indices: [],
      elements: [],
      details: {},
      error: null,
    };

    let pipelinesResponse;
    let indicesSettings;

    try {
      pipelinesResponse = await this.getModelsPipelines([modelId]);

      const pipelines = pipelinesResponse?.get(modelId);
      const modelNodeId = this.getNodeId(modelId, JOB_MAP_NODE_TYPES.TRAINED_MODEL);

      if (pipelines) {
        const pipelineIds = new Set(Object.keys(pipelines));
        result.ingestPipelines = pipelinesResponse;

        for (const pipelineId of pipelineIds) {
          const pipelineNodeId = this.getNodeId(pipelineId, JOB_MAP_NODE_TYPES.INGEST_PIPELINE);
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

            result.indices.push(destinationIndexDetails);

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

              result.indices.push(destIndex);

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
      return result;
    } catch (error) {
      if (error.statusCode === 404) {
        // ES returns 404 when there are no pipelines
        // Instead, we should return the modelIdsMap and a 200
        return result;
      }
      throw error;
    }

    return result;
  }

  /**
   * Deletes associated pipelines of the requested model
   * @param modelIds
   */
  async deleteModelPipelines(modelIds: string[]) {
    const pipelines = await this.getModelsPipelines(modelIds);
    const pipelinesIds: string[] = [
      ...new Set([...pipelines.values()].flatMap((v) => Object.keys(v!))),
    ];
    await Promise.all(
      pipelinesIds.map((id) => this._client.asCurrentUser.ingest.deletePipeline({ id }))
    );
  }
}
