/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { createGrokProcessor } from '../../../../common/pipeline_utils';
import { EsqlTransport } from '../../../lib/esql_transport';
import { NewestIndex } from '../../../../common/types';
import { LOG_LEVEL_FIELD, MESSAGE_FIELD } from '../../../../common/constants';
import { createFieldExtractionDetection } from '../../../../common/detections/utils';
import { FieldExtractionDetection } from '../../../../common/detections/types';

const LOG_LEVEL_PATTERN = '\\b%{LOGLEVEL:log.level}\\b';

export class LogLevelExtractionDetectionRule {
  constructor(private esqlTransport: EsqlTransport) {}

  async process(index: NewestIndex): Promise<FieldExtractionDetection | null> {
    const hasMessageMapping = MESSAGE_FIELD in (index.mappings?.properties ?? {});
    if (!hasMessageMapping) {
      return null;
    }

    try {
      const esqlTable = await this.esqlTransport.query(this.buildQuery(index));

      const esqlDocs = esqlTable.toDocuments();

      const canExtractLogLevel = esqlDocs.total > 0;
      if (canExtractLogLevel) {
        return createFieldExtractionDetection({
          sourceField: MESSAGE_FIELD,
          targetField: LOG_LEVEL_FIELD,
          pattern: LOG_LEVEL_PATTERN,
          documentSamples: esqlDocs.hits,
          tasks: {
            processors: this.buildPipelineProcessors(LOG_LEVEL_PATTERN),
          },
        });
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  private buildQuery(index: NewestIndex) {
    const hasLogLevelMapping = LOG_LEVEL_FIELD in (index.mappings?.properties ?? {});

    const filterIfExists = hasLogLevelMapping ? `| WHERE ${LOG_LEVEL_FIELD} IS NULL` : '';

    return `FROM ${index.name}
            ${filterIfExists}
            | WHERE ${MESSAGE_FIELD} IS NOT NULL
            | GROK ${MESSAGE_FIELD} ${JSON.stringify(LOG_LEVEL_PATTERN)}
            | WHERE ${LOG_LEVEL_FIELD} IS NOT NULL
            | KEEP ${MESSAGE_FIELD}
            | LIMIT 5
    `;
  }

  private buildPipelineProcessors(pattern: string): IngestProcessorContainer[] {
    return [createGrokProcessor({ field: MESSAGE_FIELD, patterns: [pattern] })];
  }
}
