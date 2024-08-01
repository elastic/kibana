/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { JSONParsingDetection } from '../../../../common/detections/types';
import { EsqlTransport } from '../../../lib/esql_transport';
import { NewestIndex } from '../../../../common/types';
import { MESSAGE_FIELD } from '../../../../common/constants';
import { createJSONParsingDetection } from '../../../../common/detections/utils';

export class JSONParsingDetectionRule {
  constructor(private esqlTransport: EsqlTransport) {}

  async process(index: NewestIndex): Promise<JSONParsingDetection | null> {
    const hasMessageMapping = MESSAGE_FIELD in (index.mappings?.properties ?? {});
    if (!hasMessageMapping) {
      return null;
    }

    try {
      const esqlTable = await this.esqlTransport.query(this.buildQuery(index));

      const esqlDocs = esqlTable.toDocuments();

      const canParseJSONMessage = esqlDocs.total > 0;
      if (canParseJSONMessage) {
        return createJSONParsingDetection({
          sourceField: MESSAGE_FIELD,
          documentSamples: esqlDocs.hits,
          tasks: {
            processors: this.buildPipelineProcessors(),
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
    return `FROM ${index.name}
            | WHERE ${MESSAGE_FIELD} IS NOT NULL
            | WHERE STARTS_WITH(${MESSAGE_FIELD}, "{") == true
            | KEEP ${MESSAGE_FIELD}
            | LIMIT 5
    `;
  }

  private buildPipelineProcessors(): IngestProcessorContainer[] {
    return [
      {
        pipeline: {
          name: 'logs@json-pipeline',
          ignore_missing_pipeline: true,
        },
      },
    ];
  }
}
