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

interface DatePreset {
  grokPattern: string;
  temporaryTarget: string;
  outputFormat: string;
}

const TEMPORARY_TIMESTAMP_FIELD = 'detected_timestamp';

const DATE_PRESETS: DatePreset[] = [
  { grokPattern: 'TIMESTAMP_ISO8601', temporaryTarget: 'timestamp_iso', outputFormat: 'ISO8601' },
  {
    grokPattern: 'SYSLOGTIMESTAMP',
    temporaryTarget: 'timestamp_sys',
    outputFormat: 'MMM dd HH:mm:ss',
  },
  {
    grokPattern: 'DATESTAMP_RFC822',
    temporaryTarget: 'timestamp_rfc822',
    outputFormat: 'EEE, dd MMM yy HH:mm:ss Z',
  },
  {
    grokPattern: 'DATESTAMP_RFC2822',
    temporaryTarget: 'timestamp_rfc2822',
    outputFormat: 'EEE, dd MMM yyyy HH:mm:ss Z',
  },
  {
    grokPattern: 'DATESTAMP_EVENTLOG',
    temporaryTarget: 'timestamp_eventlog',
    outputFormat: 'yyyyMMddHHmmss',
  },
  {
    grokPattern: 'HTTPDATE',
    temporaryTarget: 'timestamp_httpdate',
    outputFormat: 'dd/MMM/yyyy:HH:mm:ss Z',
  },
  {
    grokPattern: 'DATESTAMP_OTHER',
    temporaryTarget: 'timestamp_other',
    outputFormat: 'EEE MMM dd HH:mm:ss Z yyyy',
  },
  { grokPattern: 'DATE_EU', temporaryTarget: 'timestamp_date_eu', outputFormat: 'dd/MM/yyyy' },
  { grokPattern: 'DATE_US', temporaryTarget: 'timestamp_date_us', outputFormat: 'MM/dd/yyyy' },
];

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
      const datePreset = DATE_PRESETS.find((date) => pattern.includes(date.grokPattern));

      if (canExtractTimestamp && datePreset) {
        return createFieldExtractionDetection({
          sourceField: MESSAGE_FIELD,
          targetField: TIMESTAMP_FIELD,
          pattern,
          documentSamples: esqlDocs.hits,
          tasks: {
            processors: this.buildPipelineProcessors(pattern, datePreset.outputFormat),
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
            ${DATE_PRESETS.map(
              ({ grokPattern, temporaryTarget }) =>
                `| GROK ${MESSAGE_FIELD} "%{${grokPattern}:${temporaryTarget}}"`
            ).join('\n')}
            | EVAL matched_pattern = CASE(
                ${DATE_PRESETS.map(
                  ({ grokPattern, temporaryTarget }) =>
                    `${temporaryTarget} IS NOT NULL, "%{${grokPattern}:${TEMPORARY_TIMESTAMP_FIELD}}",`
                ).join('\n')}
                ""
            )
            | EVAL matched_value = COALESCE(${DATE_PRESETS.map(
              (date) => date.temporaryTarget
            ).join()})
            | WHERE matched_pattern != ""
            | WHERE matched_value != DATE_FORMAT(@timestamp)
            | KEEP @timestamp,${MESSAGE_FIELD},matched_pattern
            | LIMIT 5
    `;
  }

  private buildPipelineProcessors(
    pattern: string,
    outputFormat: DatePreset['outputFormat']
  ): IngestProcessorContainer[] {
    return [
      createGrokProcessor({ field: MESSAGE_FIELD, patterns: [pattern] }),
      {
        date: {
          field: TEMPORARY_TIMESTAMP_FIELD,
          formats: [outputFormat],
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
