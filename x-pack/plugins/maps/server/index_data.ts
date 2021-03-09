/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'kibana/server';
import { Logger } from 'src/core/server';
import {
  INDEX_META_DATA_CREATED_BY,
  ImportResponse,
  ImportFailure,
  Settings,
  Mappings,
} from '../common';
import { IndexPatternsService } from '../../../../src/plugins/data/common';

export type InputData = any[];
interface BodySettings {
  [key: string]: any;
}

const DEFAULT_SETTINGS = { number_of_shards: 1 };
const DEFAULT_MAPPINGS = {
  _meta: {
    created_by: INDEX_META_DATA_CREATED_BY,
  },
};

export function indexDataProvider(
  { asCurrentUser }: IScopedClusterClient,
  indexPatternsService: IndexPatternsService,
  logger: Logger
) {
  async function indexData(
    index: string,
    mappings: Mappings,
    data: InputData
  ): Promise<ImportResponse> {
    const docCount = data.length;
    enum IndexStep {
      CREATING_INDEX = 'creating index',
      CREATING_INDEX_PATTERN = 'creating index pattern',
      INDEXING_DATA = 'indexing data',
    }
    let currentStep: IndexStep = IndexStep.CREATING_INDEX;

    try {
      await createIndex(index, mappings);
      currentStep = IndexStep.CREATING_INDEX_PATTERN;
      await createIndexPattern(index);

      let failures: ImportFailure[] = [];
      currentStep = IndexStep.INDEXING_DATA;
      const resp = await writeDataToIndex(index, data);
      if (resp.success === false) {
        if (resp.ingestError) {
          throw resp;
        } else {
          logger.warn(`Error: some documents failed to index. ${resp.failures}`);
          failures = resp.failures || [];
        }
      }

      return {
        success: true,
        index,
        docCount,
        failures,
      };
    } catch (error) {
      logger.error(`Failure detected while ${currentStep}`);
      return {
        success: false,
        index,
        error: error.body ? error.body : error,
        docCount,
        ingestError: error.ingestError,
        failures: error.failures || [],
      };
    }
  }

  async function createIndex(indexName: string, mappings: Mappings) {
    const body: { mappings: Mappings; settings: BodySettings } = {
      mappings: {
        ...DEFAULT_MAPPINGS,
        ...mappings,
      },
      settings: DEFAULT_SETTINGS,
    };

    await asCurrentUser.indices.create({ index: indexName, body });
  }

  async function createIndexPattern(indexPatternName: string) {
    await indexPatternsService.createAndSave(
      {
        title: indexPatternName,
      },
      true
    );
  }

  async function writeDataToIndex(index: string, data: InputData) {
    try {
      const body = [];
      for (let i = 0; i < data.length; i++) {
        body.push({ index: {} });
        body.push(data[i]);
      }

      const settings: Settings = { index, body };
      const { body: resp } = await asCurrentUser.bulk(settings);
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
    indexData,
  };
}
