/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseInterval } from 'ui/utils/parse_interval';
import { JobCreator } from './job_creator';
import { Field, Aggregation } from '../../../../../common/types/fields';
import { Detector, BucketSpan } from './configs';
import { createBasicDetector } from './util/default_configs';

export class SingleMetricJobCreator extends JobCreator {
  private _field: Field | null = null;
  private _agg: Aggregation | null = null;

  public setDetector(agg: Aggregation, field: Field | null) {
    const dtr: Detector = createBasicDetector(agg, field);

    if (this._detectors.length === 0) {
      this._addDetector(dtr);
    } else {
      this._editDetector(dtr, 0);
    }

    this._field = field;
    this._agg = agg;

    this._createAggregations();
  }

  public set bucketSpan(bucketSpan: BucketSpan) {
    this._job_config.analysis_config.bucket_span = bucketSpan;
    this._createAggregations();
  }

  private _createAggregations() {
    if (
      this._detectors.length &&
      typeof this._job_config.analysis_config.bucket_span === 'string' &&
      this._agg !== null
    ) {
      delete this._job_config.analysis_config.summary_count_field_name;
      delete this._datafeed_config.aggregations;

      const functionName = this._agg.dslName;
      const timeField = this._job_config.data_description.time_field;

      const duration = parseInterval(this._job_config.analysis_config.bucket_span);
      if (duration === null) {
        return;
      }

      const bucketSpanSeconds = duration.asSeconds();
      const interval = bucketSpanSeconds * 1000;

      switch (functionName) {
        case 'count':
          this._job_config.analysis_config.summary_count_field_name = 'doc_count';

          this._datafeed_config.aggregations = {
            buckets: {
              date_histogram: {
                field: timeField,
                interval,
              },
              aggregations: {
                [timeField]: {
                  max: {
                    field: timeField,
                  },
                },
              },
            },
          };
          break;
        case 'avg':
        case 'median':
        case 'sum':
        case 'min':
        case 'max':
          if (this._field !== null) {
            const fieldName = this._field.name;
            this._job_config.analysis_config.summary_count_field_name = 'doc_count';

            this._datafeed_config.aggregations = {
              buckets: {
                date_histogram: {
                  field: timeField,
                  interval: (interval / 100) * 10, // use 10% of bucketSpan to allow for better sampling
                },
                aggregations: {
                  [fieldName]: {
                    [functionName]: {
                      field: fieldName,
                    },
                  },
                  [timeField]: {
                    max: {
                      field: timeField,
                    },
                  },
                },
              },
            };
          }
          break;
        case 'cardinality':
          if (this._field !== null) {
            const fieldName = this._field.name;

            this._job_config.analysis_config.summary_count_field_name = `dc_${fieldName}`;

            this._datafeed_config.aggregations = {
              buckets: {
                date_histogram: {
                  field: timeField,
                  interval,
                },
                aggregations: {
                  [timeField]: {
                    max: {
                      field: timeField,
                    },
                  },
                  [this._job_config.analysis_config.summary_count_field_name]: {
                    [functionName]: {
                      field: fieldName,
                    },
                  },
                },
              },
            };

            const dtr = this._detectors[0];
            // finally, modify the detector before saving
            dtr.function = 'non_zero_count';
            // add a description using the original function name rather 'non_zero_count'
            // as the user may not be aware it's been changed
            dtr.detector_description = `${functionName} (${fieldName})`;
            delete dtr.field_name;
          }
          break;
        default:
          break;
      }
    }
  }
}
