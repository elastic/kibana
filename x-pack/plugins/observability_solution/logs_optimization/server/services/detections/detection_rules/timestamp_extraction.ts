/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsqlTransport } from '@kbn/logs-optimization-plugin/server/lib/esql_transport';
import first from 'lodash/first';
import uniq from 'lodash/uniq';
import { NewestIndex } from '@kbn/logs-optimization-plugin/common/types';
import { MESSAGE_FIELD, TIMESTAMP_FIELD } from '../../../../common/constants';
import { createFieldExtractionDetection } from '../../../../common/detections/utils';
import { FieldExtractionDetection } from '../../../../common/detections/types';

export class TimestampExtractionDetection {
  constructor(private esqlTransport: EsqlTransport) {}

  async process(index: NewestIndex): Promise<FieldExtractionDetection | null> {
    const hasMessageMapping = MESSAGE_FIELD in (index.mappings?.properties ?? {});
    if (!hasMessageMapping) {
      return null;
    }

    try {
      const esqlTable = await this.esqlTransport.query(this.buildQuery(index));

      const esqlValues = esqlTable.getValues();
      const esqlUniqueValues = uniq(esqlValues);

      const canExtractTimestamp = esqlUniqueValues.length > 0;

      if (canExtractTimestamp) {
        return createFieldExtractionDetection({
          sourceField: MESSAGE_FIELD,
          targetField: TIMESTAMP_FIELD,
          pattern: first(esqlUniqueValues) as string,
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
            | GROK ${MESSAGE_FIELD} "%{DATESTAMP_RFC822:timestamp_rfc822}"
            | GROK ${MESSAGE_FIELD} "%{DATESTAMP_RFC2822:timestamp_rfc2822}"
            | GROK ${MESSAGE_FIELD} "%{DATESTAMP_EVENTLOG:timestamp_eventlog}"
            | GROK ${MESSAGE_FIELD} "%{HTTPDATE:timestamp_httpdate}"
            | GROK ${MESSAGE_FIELD} "%{DATESTAMP_OTHER:timestamp_other}"
            | GROK ${MESSAGE_FIELD} "%{DATE_EU:timestamp_date_eu}"
            | GROK ${MESSAGE_FIELD} "%{DATE_US:timestamp_date_us}"
            | EVAL matched_pattern = CASE(
                timestamp_iso IS NOT NULL, "%{TIMESTAMP_ISO8601:@timestamp}",
                timestamp_rfc822 IS NOT NULL, "%{DATESTAMP_RFC822:@timestamp}",
                timestamp_rfc2822 IS NOT NULL, "%{DATESTAMP_RFC2822:@timestamp}",
                timestamp_eventlog IS NOT NULL, "%{DATESTAMP_EVENTLOG:@timestamp}",
                timestamp_httpdate IS NOT NULL, "%{HTTPDATE:@timestamp}",
                timestamp_other IS NOT NULL, "%{DATESTAMP_OTHER:@timestamp}",
                timestamp_date_eu IS NOT NULL, "%{DATE_EU:@timestamp}",
                timestamp_date_us IS NOT NULL, "%{DATE_US:@timestamp}",
                null
            )
            | KEEP matched_pattern
    `;
  }
}
