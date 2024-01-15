/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { Subject } from 'rxjs';
import { DataStreamSpacesAdapter } from '@kbn/data-stream-adapter';
import { ecsFieldMap } from '@kbn/data-stream-adapter/ecs';
import { resultsFieldMap } from './results_field_map';

const TOTAL_FIELDS_LIMIT = 2500;

export const RESULTS_DATA_STREAM_NAME = '.kibana-dqa-dashboard-results';

const RESULTS_INDEX_TEMPLATE_NAME = '.kibana-dqa-dashboard-results-index-template';
const RESULTS_COMPONENT_TEMPLATE_NAME = '.kibana-dqa-dashboard-results-mappings';
const ECS_COMPONENT_TEMPLATE_NAME = '.kibana-dqa-dashboard-ecs-mappings';

export class ResultsDataStream {
  private readonly dataStream: DataStreamSpacesAdapter;
  // private error: Error | null = null;
  private installPromise?: Promise<void>;

  constructor({ kibanaVersion }: { kibanaVersion: string }) {
    this.dataStream = new DataStreamSpacesAdapter(RESULTS_DATA_STREAM_NAME, {
      kibanaVersion,
      totalFieldsLimit: TOTAL_FIELDS_LIMIT,
    });

    this.dataStream.setComponentTemplate({
      name: ECS_COMPONENT_TEMPLATE_NAME,
      fieldMap: ecsFieldMap,
    });
    this.dataStream.setComponentTemplate({
      name: RESULTS_COMPONENT_TEMPLATE_NAME,
      fieldMap: resultsFieldMap,
    });

    this.dataStream.setIndexTemplate({
      name: RESULTS_INDEX_TEMPLATE_NAME,
      componentTemplateRefs: [RESULTS_COMPONENT_TEMPLATE_NAME, ECS_COMPONENT_TEMPLATE_NAME],
    });
  }

  async install(params: {
    esClient: Promise<ElasticsearchClient>;
    logger: Logger;
    pluginStop$: Subject<void>;
  }) {
    try {
      this.installPromise = this.dataStream.install(params);
      await this.installPromise;
    } catch (err) {
      params.logger.error(
        `Error installing results data stream. Data quality dashboard persistence may be impacted.- ${err.message}`,
        err
      );
    }
  }

  async getSpaceIndexName(spaceId: string) {
    if (!this.installPromise) {
      throw new Error('Results data stream not installed');
    }
    // wait for install to complete, may reject if install failed, routes should handle this
    await this.installPromise;

    let indexName = await this.dataStream.getSpaceIndexName(spaceId);
    if (!indexName) {
      indexName = await this.dataStream.installSpace(spaceId);
    }
    return indexName;
  }
}
