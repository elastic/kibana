/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPatternTitle } from '../../../../../../../common/types/kibana';
import { Field, Aggregation, EVENT_RATE_FIELD_ID } from '../../../../../../../common/types/fields';
import { Job, Datafeed, Detector } from '../../../../../../../common/types/anomaly_detection_jobs';
import { splitIndexPatternNames } from '../../../../../../../common/util/job_utils';

export function createEmptyJob(): Job {
  return {
    job_id: '',
    description: '',
    groups: [],
    analysis_config: {
      bucket_span: '',
      detectors: [],
      influencers: [],
    },
    data_description: {
      time_field: '',
    },
  };
}

export function createEmptyDatafeed(indexPatternTitle: IndexPatternTitle): Datafeed {
  return {
    datafeed_id: '',
    job_id: '',
    indices: splitIndexPatternNames(indexPatternTitle),
    query: {},
  };
}

export function createBasicDetector(agg: Aggregation, field: Field) {
  const dtr: Detector = {
    function: agg.id,
  };

  if (field.id !== EVENT_RATE_FIELD_ID) {
    dtr.field_name = field.id;
  }
  return dtr;
}
