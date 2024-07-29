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
import { MESSAGE_FIELD, TIMESTAMP_FIELD } from '../../../../common/constants';
import { createFieldExtractionDetection } from '../../../../common/detections/utils';
import { FieldExtractionDetection } from '../../../../common/detections/types';

const TEMPORARY_TIMESTAMP_FIELD = 'detected_timestamp';

export class TimestampExtractionDetectionRule {
  constructor(private esqlTransport: EsqlTransport) {}

  async process(index: NewestIndex): Promise<FieldExtractionDetection | null> {
    const hasMessageMapping = MESSAGE_FIELD in (index.mappings?.properties ?? {});
    if (!hasMessageMapping) {
      return null;
    }

    try {
      const esqlTable = await this.esqlTransport.query(this.buildQuery(index));

      const esqlDocs = esqlTable.toDocuments();
      const pattern = esqlDocs.hits.find((doc) => Boolean(doc._source.matched_pattern))?._source
        .matched_pattern as string;

      const canExtractTimestamp = Boolean(pattern);

      if (canExtractTimestamp) {
        return createFieldExtractionDetection({
          sourceField: MESSAGE_FIELD,
          targetField: TIMESTAMP_FIELD,
          pattern,
          documentSamples: esqlDocs.hits,
          tasks: {
            processors: this.buildPipelineProcessors(pattern),
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
            | GROK ${MESSAGE_FIELD} "%{TIMESTAMP_ISO8601:timestamp_iso}"
            | GROK ${MESSAGE_FIELD} "%{SYSLOGTIMESTAMP:timestamp_sys}"
            | GROK ${MESSAGE_FIELD} "%{DATESTAMP_RFC822:timestamp_rfc822}"
            | GROK ${MESSAGE_FIELD} "%{DATESTAMP_RFC2822:timestamp_rfc2822}"
            | GROK ${MESSAGE_FIELD} "%{DATESTAMP_EVENTLOG:timestamp_eventlog}"
            | GROK ${MESSAGE_FIELD} "%{HTTPDATE:timestamp_httpdate}"
            | GROK ${MESSAGE_FIELD} "%{DATESTAMP_OTHER:timestamp_other}"
            | GROK ${MESSAGE_FIELD} "%{DATE_EU:timestamp_date_eu}"
            | GROK ${MESSAGE_FIELD} "%{DATE_US:timestamp_date_us}"
            | EVAL matched_pattern = CASE(
                timestamp_iso IS NOT NULL, "%{TIMESTAMP_ISO8601:${TEMPORARY_TIMESTAMP_FIELD}}",
                timestamp_sys IS NOT NULL, "%{SYSLOGTIMESTAMP:${TEMPORARY_TIMESTAMP_FIELD}}",
                timestamp_rfc822 IS NOT NULL, "%{DATESTAMP_RFC822:${TEMPORARY_TIMESTAMP_FIELD}}",
                timestamp_rfc2822 IS NOT NULL, "%{DATESTAMP_RFC2822:${TEMPORARY_TIMESTAMP_FIELD}}",
                timestamp_eventlog IS NOT NULL, "%{DATESTAMP_EVENTLOG:${TEMPORARY_TIMESTAMP_FIELD}}",
                timestamp_httpdate IS NOT NULL, "%{HTTPDATE:${TEMPORARY_TIMESTAMP_FIELD}}",
                timestamp_other IS NOT NULL, "%{DATESTAMP_OTHER:${TEMPORARY_TIMESTAMP_FIELD}}",
                timestamp_date_eu IS NOT NULL, "%{DATE_EU:${TEMPORARY_TIMESTAMP_FIELD}}",
                timestamp_date_us IS NOT NULL, "%{DATE_US:${TEMPORARY_TIMESTAMP_FIELD}}",
                ""
            )
            | EVAL matched_value = COALESCE(timestamp_iso, timestamp_sys, timestamp_rfc822, timestamp_rfc2822, timestamp_eventlog, timestamp_httpdate, timestamp_other, timestamp_date_eu, timestamp_date_us)
            | WHERE matched_pattern != ""
            | WHERE matched_value != DATE_FORMAT(@timestamp)
            | KEEP @timestamp,${MESSAGE_FIELD},matched_pattern
            | LIMIT 5
    `;
  }

  private buildPipelineProcessors(pattern: string): IngestProcessorContainer[] {
    return [
      createGrokProcessor({ field: MESSAGE_FIELD, patterns: [pattern] }),
      {
        date: {
          field: TEMPORARY_TIMESTAMP_FIELD,
          formats: ['ISO8601', 'UNIX', 'UNIX_MS', 'TAI64N'],
          ignore_failure: true,
        },
      },
      {
        remove: {
          field: TEMPORARY_TIMESTAMP_FIELD,
          ignore_failure: true,
          ignore_missing: true,
        },
      },
    ];
  }
}
