/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Job, Datafeed } from '../configs';
import { IndexPatternTitle } from '../../../../../../common/types/kibana';

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
    indices: [indexPatternTitle],
    query: {},
  };
}
