/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyScopedClusterClient } from 'kibana/server';
import { INDEX_META_DATA_CREATED_BY } from '../../../common/constants/file_datavisualizer';
import {
  ImportResponse,
  ImportFailure,
  Settings,
  Mappings,
  IngestPipelineWrapper,
} from '../../../common/types/file_datavisualizer';
import { InputData } from './file_data_visualizer';

export function importDataProvider({ callAsCurrentUser }: ILegacyScopedClusterClient) {
  async function importData(
    id: string,
    index: string,
    settings: Settings,
    mappings: Mappings,
    ingestPipeline: IngestPipelineWrapper,
    data: InputData
  ): Promise<ImportResponse> {
    let createdIndex;
    let createdPipelineId;
    const docCount = data.length;

    try {
      const { id: pipelineId, pipeline } = ingestPipeline;

      if (id === undefined) {
        // first chunk of data, create the index and id to return
        id = generateId();

        await createIndex(index, settings, mappings);
        createdIndex = index;

        // create the pipeline if one has been supplied
        if (pipelineId !== undefined) {
          const success = await createPipeline(pipelineId, pipeline);
          if (success.acknowledged !== true) {
            throw success;
          }
        }
        createdPipelineId = pipelineId;
      } else {
        createdIndex = index;
        createdPipelineId = pipelineId;
      }

      let failures: ImportFailure[] = [];
      if (data.length) {
        const resp = await indexData(index, createdPipelineId, data);
        if (resp.success === false) {
          if (resp.ingestError) {
            // all docs failed, abort
            throw resp;
          } else {
            // some docs failed.
            // still report success but with a list of failures
            failures = resp.failures || [];
          }
        }
      }

      return {
        success: true,
        id,
        index: createdIndex,
        pipelineId: createdPipelineId,
        docCount,
        failures,
      };
    } catch (error) {
      return {
        success: false,
        id,
        index: createdIndex,
        pipelineId: createdPipelineId,
        error: error.error !== undefined ? error.error : error,
        docCount,
        ingestError: error.ingestError,
        failures: error.failures || [],
      };
    }
  }

  async function createIndex(index: string, settings: Settings, mappings: Mappings) {
    const body: { mappings: Mappings; settings?: Settings } = {
      mappings: {
        _meta: {
          created_by: INDEX_META_DATA_CREATED_BY,
        },
        properties: mappings,
      },
    };

    if (settings && Object.keys(settings).length) {
      body.settings = settings;
    }

    await callAsCurrentUser('indices.create', { index, body });
  }

  async function indexData(index: string, pipelineId: string, data: InputData) {
    try {
      const body = [];
      for (let i = 0; i < data.length; i++) {
        body.push({ index: {} });
        body.push(data[i]);
      }

      const settings: Settings = { index, body };
      if (pipelineId !== undefined) {
        settings.pipeline = pipelineId;
      }

      const resp = await callAsCurrentUser('bulk', settings);
      if (resp.errors) {
        throw resp;
      } else {
        return {
          success: true,
          docs: data.length,
          failures: [],
        };
      }
    } catch (error) {
      let failures: ImportFailure[] = [];
      let ingestError = false;
      if (error.errors !== undefined && Array.isArray(error.items)) {
        // an expected error where some or all of the bulk request
        // docs have failed to be ingested.
        failures = getFailures(error.items, data);
      } else {
        // some other error has happened.
        ingestError = true;
      }

      return {
        success: false,
        error,
        docCount: data.length,
        failures,
        ingestError,
      };
    }
  }

  async function createPipeline(id: string, pipeline: any) {
    return await callAsCurrentUser('ingest.putPipeline', { id, body: pipeline });
  }

  function getFailures(items: any[], data: InputData): ImportFailure[] {
    const failures = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.index && item.index.error) {
        failures.push({
          item: i,
          reason: item.index.error.reason,
          doc: data[i],
        });
      }
    }
    return failures;
  }

  return {
    importData,
  };
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}
