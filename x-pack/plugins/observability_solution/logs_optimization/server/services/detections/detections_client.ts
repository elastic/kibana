/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server';
import { NewestIndex } from '@kbn/logs-optimization-plugin/common/types';
import { Detection } from '../../../common/detections/types';
import { EsqlTransport } from '../../lib/esql_transport';
import { LogLevelExtractionDetection } from './detection_rules/log_level_extraction';
import { MappingEcsGapsDetection } from './detection_rules/mapping_ecs_gaps';
import { TimestampExtractionDetection } from './detection_rules/timestamp_extraction';
import { IDetectionsClient } from './types';

interface DetectionsClientDeps {
  logger: Logger;
  esClient: ElasticsearchClient;
  esqlTransport: EsqlTransport;
  fieldsMetadataClient: IFieldsMetadataClient;
}

export class DetectionsClient implements IDetectionsClient {
  private constructor(
    private readonly logger: Logger,
    private readonly esClient: ElasticsearchClient,
    private readonly esqlTransport: EsqlTransport,
    private readonly fieldsMetadataClient: IFieldsMetadataClient
  ) {}

  async detectFrom(index: NewestIndex): Promise<Detection[]> {
    const detectionRules = [
      new MappingEcsGapsDetection(this.fieldsMetadataClient),
      new TimestampExtractionDetection(this.esqlTransport),
      new LogLevelExtractionDetection(this.esqlTransport),
    ];

    const detections = (
      await Promise.all(detectionRules.map((detection) => detection.process(index)))
    ).filter(Boolean) as Detection[];

    this.logger.debug(`Detected ${detections.length} possible changes`);

    return detections;
  }

  public static create({
    logger,
    esClient,
    fieldsMetadataClient,
    esqlTransport,
  }: DetectionsClientDeps) {
    return new DetectionsClient(logger, esClient, esqlTransport, fieldsMetadataClient);
  }
}
