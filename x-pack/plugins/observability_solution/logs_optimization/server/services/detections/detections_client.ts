/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server';
import { NewestIndex } from '../../../common/types';
import { Detection } from '../../../common/detections/types';
import { EsqlTransport } from '../../lib/esql_transport';
import { JSONParsingDetectionRule } from './detection_rules/json_parsing';
import { LogLevelExtractionDetectionRule } from './detection_rules/log_level_extraction';
import { MappingGapsDetectionRule } from './detection_rules/mapping_ecs_gaps';
import { TimestampExtractionDetectionRule } from './detection_rules/timestamp_extraction';
import { IDetectionsClient } from './types';
import { DetectionRulesExecutor } from './detection_rules_executor';

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
    const detections = await DetectionRulesExecutor.create(index)
      .add([
        new MappingGapsDetectionRule(this.fieldsMetadataClient),
        new JSONParsingDetectionRule(this.esqlTransport),
      ])
      .add((prevDetections) =>
        prevDetections.some((detection) => detection.type === 'json_parsing')
          ? []
          : [
              new TimestampExtractionDetectionRule(this.esqlTransport),
              new LogLevelExtractionDetectionRule(this.esqlTransport),
            ]
      )
      .runDetections();

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
