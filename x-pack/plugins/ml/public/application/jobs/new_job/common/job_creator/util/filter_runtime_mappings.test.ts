/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Job, Datafeed } from '../../../../../../../common/types/anomaly_detection_jobs';
import { filterRuntimeMappings } from './filter_runtime_mappings';

function getJob(): Job {
  return {
    job_id: 'test',
    description: '',
    groups: [],
    analysis_config: {
      bucket_span: '15m',
      detectors: [
        {
          function: 'mean',
          field_name: 'responsetime',
        },
      ],
      influencers: [],
    },
    data_description: {
      time_field: '@timestamp',
    },
    analysis_limits: {
      model_memory_limit: '11MB',
    },
    model_plot_config: {
      enabled: false,
      annotations_enabled: false,
    },
  };
}

function getDatafeed(): Datafeed {
  return {
    datafeed_id: 'datafeed-test',
    job_id: 'dds',
    indices: ['farequote-*'],
    query: {
      bool: {
        must: [
          {
            match_all: {},
          },
        ],
      },
    },
    runtime_mappings: {
      responsetime_big: {
        type: 'double',
        script: {
          source: "emit(doc['responsetime'].value * 100.0)",
        },
      },
      airline_lower: {
        type: 'keyword',
        script: {
          source: "emit(doc['airline'].value.toLowerCase())",
        },
      },
    },
  };
}

function getAggs() {
  return {
    buckets: {
      date_histogram: {
        field: '@timestamp',
        fixed_interval: '90000ms',
      },
      aggregations: {
        responsetime: {
          avg: {
            field: 'responsetime_big',
          },
        },
        '@timestamp': {
          max: {
            field: '@timestamp',
          },
        },
      },
    },
  };
}

describe('filter_runtime_mappings', () => {
  describe('filterRuntimeMappings()', () => {
    let job: Job;
    let datafeed: Datafeed;
    beforeEach(() => {
      job = getJob();
      datafeed = getDatafeed();
    });

    test('returns no runtime mappings, no mappings in aggs', () => {
      const resp = filterRuntimeMappings(job, datafeed);
      expect(Object.keys(resp.runtime_mappings).length).toEqual(0);

      expect(Object.keys(resp.discarded_mappings).length).toEqual(2);
      expect(resp.discarded_mappings.responsetime_big).not.toEqual(undefined);
      expect(resp.discarded_mappings.airline_lower).not.toEqual(undefined);
    });

    test('returns no runtime mappings, no runtime mappings in datafeed', () => {
      datafeed.runtime_mappings = undefined;
      const resp = filterRuntimeMappings(job, datafeed);
      expect(Object.keys(resp.runtime_mappings).length).toEqual(0);
      expect(resp.runtime_mappings.responsetime_big).toEqual(undefined);

      expect(Object.keys(resp.discarded_mappings).length).toEqual(0);
      expect(resp.discarded_mappings.airline_lower).toEqual(undefined);
    });

    test('return one runtime mapping and one unused mapping, mappings in aggs', () => {
      datafeed.aggregations = getAggs();
      const resp = filterRuntimeMappings(job, datafeed);
      expect(Object.keys(resp.runtime_mappings).length).toEqual(1);
      expect(resp.runtime_mappings.responsetime_big).not.toEqual(undefined);

      expect(Object.keys(resp.discarded_mappings).length).toEqual(1);
      expect(resp.discarded_mappings.airline_lower).not.toEqual(undefined);
    });

    test('return no runtime mappings, no mappings in aggs', () => {
      datafeed.aggregations = getAggs();
      datafeed.aggregations!.buckets!.aggregations!.responsetime!.avg!.field! = 'responsetime';

      const resp = filterRuntimeMappings(job, datafeed);
      expect(Object.keys(resp.runtime_mappings).length).toEqual(0);

      expect(Object.keys(resp.discarded_mappings).length).toEqual(2);
      expect(resp.discarded_mappings.responsetime_big).not.toEqual(undefined);
      expect(resp.discarded_mappings.airline_lower).not.toEqual(undefined);
    });

    test('return one runtime mapping and one unused mapping, no mappings in aggs', () => {
      // set the detector field to be a runtime mapping
      job.analysis_config.detectors[0].field_name = 'responsetime_big';
      const resp = filterRuntimeMappings(job, datafeed);
      expect(Object.keys(resp.runtime_mappings).length).toEqual(1);
      expect(resp.runtime_mappings.responsetime_big).not.toEqual(undefined);

      expect(Object.keys(resp.discarded_mappings).length).toEqual(1);
      expect(resp.discarded_mappings.airline_lower).not.toEqual(undefined);
    });

    test('return two runtime mappings, no mappings in aggs', () => {
      // set the detector field to be a runtime mapping
      job.analysis_config.detectors[0].field_name = 'responsetime_big';
      // set the detector by field to be a runtime mapping
      job.analysis_config.detectors[0].by_field_name = 'airline_lower';
      const resp = filterRuntimeMappings(job, datafeed);
      expect(Object.keys(resp.runtime_mappings).length).toEqual(2);
      expect(resp.runtime_mappings.responsetime_big).not.toEqual(undefined);
      expect(resp.runtime_mappings.airline_lower).not.toEqual(undefined);

      expect(Object.keys(resp.discarded_mappings).length).toEqual(0);
    });

    test('return two runtime mappings, no mappings in aggs, categorization job', () => {
      job.analysis_config.detectors[0].function = 'count';
      // set the detector field to be a runtime mapping
      job.analysis_config.detectors[0].field_name = undefined;
      // set the detector by field to be a runtime mapping
      job.analysis_config.detectors[0].by_field_name = 'mlcategory';
      job.analysis_config.categorization_field_name = 'airline_lower';

      const resp = filterRuntimeMappings(job, datafeed);
      expect(Object.keys(resp.runtime_mappings).length).toEqual(1);
      expect(resp.runtime_mappings.airline_lower).not.toEqual(undefined);

      expect(Object.keys(resp.discarded_mappings).length).toEqual(1);
      expect(resp.discarded_mappings.responsetime_big).not.toEqual(undefined);
    });
  });
});
