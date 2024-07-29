/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { CoreSetup, ElasticsearchClient } from '@kbn/core/server';
import { FieldsMetadataServerStart } from '@kbn/fields-metadata-plugin/server';
import { Detection } from '../../../common/detections/types';
import { NewestIndex } from '../../../common/types';
import { DetectionsClient } from './detections_client';
import type { JSONParsingDetectionRule } from './detection_rules/json_parsing';
import type { LogLevelExtractionDetectionRule } from './detection_rules/log_level_extraction';
import type { MappingGapsDetectionRule } from './detection_rules/mapping_ecs_gaps';
import type { TimestampExtractionDetectionRule } from './detection_rules/timestamp_extraction';

export interface DetectionsServiceSetupDeps {
  getStartServices: CoreSetup['getStartServices'];
}

export interface DetectionsServiceStartDeps {
  fieldsMetadata: FieldsMetadataServerStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DetectionsServiceSetup {}

export interface DetectionsServiceStart {
  getClient(client: ElasticsearchClient): Promise<DetectionsClient>;
}

export interface IDetectionsClient {
  detectFrom(index: NewestIndex): Promise<Detection[]>;
}

export interface LogSource {
  message?: string;
  [key: string]: unknown;
}

export type LogDocument = SearchHit<LogSource>;

export type DetectionRule =
  | JSONParsingDetectionRule
  | LogLevelExtractionDetectionRule
  | MappingGapsDetectionRule
  | TimestampExtractionDetectionRule;
