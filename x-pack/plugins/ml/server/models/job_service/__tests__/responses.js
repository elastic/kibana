/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

export const jobs = {
  'count': 2,
  'jobs': [{
    'job_id': 'test1',
    'job_type': 'anomaly_detector',
    'job_version': '7.0.0-alpha1',
    'groups': ['testgroup', 'farequote', 'calgroup', 'testtest'],
    'description': '',
    'create_time': 1534424930549,
    'finished_time': 1534424933261,
    'established_model_memory': 35978,
    'analysis_config': {
      'bucket_span': '15m',
      'summary_count_field_name': 'doc_count',
      'detectors': [{
        'detector_description': 'mean(DistanceKilometers)',
        'function': 'mean',
        'field_name': 'DistanceKilometers',
        'detector_index': 0
      }],
      'influencers': []
    },
    'analysis_limits': {
      'model_memory_limit': '10mb',
      'categorization_examples_limit': 4
    },
    'data_description': {
      'time_field': 'timestamp',
      'time_format': 'epoch_ms'
    },
    'model_plot_config': {
      'enabled': true
    },
    'model_snapshot_retention_days': 1,
    'custom_settings': {
      'created_by': 'single-metric-wizard'
    },
    'model_snapshot_id': '1534424932',
    'model_snapshot_min_version': '6.4.0',
    'results_index_name': 'shared'
  }, {
    'job_id': 'test2',
    'job_type': 'anomaly_detector',
    'job_version': '7.0.0-alpha1',
    'groups': ['testgroup', 'farequote', 'calgroup', 'testtest'],
    'description': '',
    'create_time': 1533841251548,
    'finished_time': 1533841253453,
    'established_model_memory': 35978,
    'analysis_config': {
      'bucket_span': '15m',
      'summary_count_field_name': 'doc_count',
      'detectors': [{
        'detector_description': 'mean(DistanceKilometers)',
        'function': 'mean',
        'field_name': 'DistanceKilometers',
        'detector_index': 0
      }],
      'influencers': []
    },
    'analysis_limits': {
      'model_memory_limit': '10mb',
      'categorization_examples_limit': 4
    },
    'data_description': {
      'time_field': 'timestamp',
      'time_format': 'epoch_ms'
    },
    'model_plot_config': {
      'enabled': true
    },
    'model_snapshot_retention_days': 1,
    'custom_settings': {
      'created_by': 'single-metric-wizard'
    },
    'model_snapshot_id': '1533841253',
    'model_snapshot_min_version': '6.4.0',
    'results_index_name': 'shared'
  }]
};

export const jobStats = {
  'count': 2,
  'jobs': [{
    'job_id': 'test1',
    'data_counts': {
      'job_id': 'test1',
      'processed_record_count': 10396,
      'processed_field_count': 20792,
      'input_bytes': 821212,
      'input_field_count': 20792,
      'invalid_date_count': 0,
      'missing_field_count': 0,
      'out_of_order_timestamp_count': 0,
      'empty_bucket_count': 199,
      'sparse_bucket_count': 0,
      'bucket_count': 4031,
      'earliest_record_timestamp': 1532908800000,
      'latest_record_timestamp': 1536536761000,
      'last_data_time': 1534424932617,
      'latest_empty_bucket_timestamp': 1536535800000,
      'input_record_count': 10396
    },
    'model_size_stats': {
      'job_id': 'test1',
      'result_type': 'model_size_stats',
      'model_bytes': 35978,
      'total_by_field_count': 3,
      'total_over_field_count': 0,
      'total_partition_field_count': 2,
      'bucket_allocation_failures_count': 0,
      'memory_status': 'ok',
      'log_time': 1534424932000,
      'timestamp': 1536535800000
    },
    'forecasts_stats': {
      'total': 0,
      'forecasted_jobs': 0
    },
    'state': 'closed'
  }, {
    'job_id': 'test2',
    'data_counts': {
      'job_id': 'test2',
      'processed_record_count': 10396,
      'processed_field_count': 20792,
      'input_bytes': 821212,
      'input_field_count': 20792,
      'invalid_date_count': 0,
      'missing_field_count': 0,
      'out_of_order_timestamp_count': 0,
      'empty_bucket_count': 199,
      'sparse_bucket_count': 0,
      'bucket_count': 4031,
      'earliest_record_timestamp': 1532908800000,
      'latest_record_timestamp': 1536536761000,
      'last_data_time': 1533841252866,
      'latest_empty_bucket_timestamp': 1536535800000,
      'input_record_count': 10396
    },
    'model_size_stats': {
      'job_id': 'test2',
      'result_type': 'model_size_stats',
      'model_bytes': 35978,
      'total_by_field_count': 3,
      'total_over_field_count': 0,
      'total_partition_field_count': 2,
      'bucket_allocation_failures_count': 0,
      'memory_status': 'ok',
      'log_time': 1533841253000,
      'timestamp': 1536535800000
    },
    'forecasts_stats': {
      'total': 0,
      'forecasted_jobs': 0
    },
    'state': 'closed'
  }]
};

export const datafeeds = {
  'count': 2,
  'datafeeds': [{
    'datafeed_id': 'datafeed-test1',
    'job_id': 'test1',
    'query_delay': '107537ms',
    'indices': ['kibana_sample_data_flights'],
    'types': [],
    'query': {
      'match_all': {
        'boost': 1
      }
    },
    'aggregations': {
      'buckets': {
        'date_histogram': {
          'field': 'timestamp',
          'interval': 90000,
          'offset': 0,
          'order': {
            '_key': 'asc'
          },
          'keyed': false,
          'min_doc_count': 0
        },
        'aggregations': {
          'DistanceKilometers': {
            'avg': {
              'field': 'DistanceKilometers'
            }
          },
          'timestamp': {
            'max': {
              'field': 'timestamp'
            }
          }
        }
      }
    },
    'scroll_size': 1000,
    'chunking_config': {
      'mode': 'manual',
      'time_span': '90000000ms'
    }
  }, {
    'datafeed_id': 'datafeed-test2',
    'job_id': 'test2',
    'query_delay': '110920ms',
    'indices': ['kibana_sample_data_flights'],
    'types': [],
    'query': {
      'match_all': {
        'boost': 1
      }
    },
    'aggregations': {
      'buckets': {
        'date_histogram': {
          'field': 'timestamp',
          'interval': 90000,
          'offset': 0,
          'order': {
            '_key': 'asc'
          },
          'keyed': false,
          'min_doc_count': 0
        },
        'aggregations': {
          'DistanceKilometers': {
            'avg': {
              'field': 'DistanceKilometers'
            }
          },
          'timestamp': {
            'max': {
              'field': 'timestamp'
            }
          }
        }
      }
    },
    'scroll_size': 1000,
    'chunking_config': {
      'mode': 'manual',
      'time_span': '90000000ms'
    }
  }]
};

export const datafeedStats = {
  'count': 2,
  'datafeeds': [{
    'datafeed_id': 'datafeed-test1',
    'state': 'stopped'
  }, {
    'datafeed_id': 'datafeed-test2',
    'state': 'stopped'
  }]
};

export const jobSummaryData = [{
  id: 'test1',
  description: '',
  groups: ['calgroup', 'farequote', 'testgroup', 'testtest'],
  processed_record_count: 10396,
  memory_status: 'ok',
  jobState: 'closed',
  hasDatafeed: 0,
  datafeedId: '',
  datafeedState: '',
  latestTimeStamp: {
    string: '2018-09-10 00:46:01',
    unix: 1536536761000,
    moment: moment('2018-09-09T23:46:01.000Z')
  },
  earliestTimeStamp: {
    string: '2018-07-30 01:00:00',
    unix: 1532908800000,
    moment: moment('2018-07-30T00:00:00.000Z')
  },
  nodeName: undefined
},
{
  id: 'test2',
  description: '',
  groups: ['calgroup', 'farequote', 'testgroup', 'testtest'],
  processed_record_count: 10396,
  memory_status: 'ok',
  jobState: 'closed',
  hasDatafeed: 0,
  datafeedId: '',
  datafeedState: '',
  latestTimeStamp: {
    string: '2018-09-10 00:46:01',
    unix: 1536536761000,
    moment: moment('2018-09-09T23:46:01.000Z')
  },
  earliestTimeStamp: {
    string: '2018-07-30 01:00:00',
    unix: 1532908800000,
    moment: moment('2018-07-30T00:00:00.000Z')
  },
  nodeName: undefined
}];

export const fullJobList = [{
  'job_id': 'test1',
  'job_type': 'anomaly_detector',
  'job_version': '7.0.0-alpha1',
  'groups': ['calgroup', 'farequote', 'testgroup', 'testtest'],
  'description': '',
  'create_time': 1534424930549,
  'finished_time': 1534424933261,
  'established_model_memory': 35978,
  'analysis_config': {
    'bucket_span': '15m',
    'summary_count_field_name': 'doc_count',
    'detectors': [{
      'detector_description': 'mean(DistanceKilometers)',
      'function': 'mean',
      'field_name': 'DistanceKilometers',
      'detector_index': 0
    }],
    'influencers': []
  },
  'analysis_limits': {
    'model_memory_limit': '10mb',
    'categorization_examples_limit': 4
  },
  'data_description': {
    'time_field': 'timestamp',
    'time_format': 'epoch_ms'
  },
  'model_plot_config': {
    'enabled': true
  },
  'model_snapshot_retention_days': 1,
  'custom_settings': {
    'created_by': 'single-metric-wizard'
  },
  'model_snapshot_id': '1534424932',
  'model_snapshot_min_version': '6.4.0',
  'results_index_name': 'shared',
  'data_counts': {
    'job_id': 'test1',
    'processed_record_count': 10396,
    'processed_field_count': 20792,
    'input_bytes': 821212,
    'input_field_count': 20792,
    'invalid_date_count': 0,
    'missing_field_count': 0,
    'out_of_order_timestamp_count': 0,
    'empty_bucket_count': 199,
    'sparse_bucket_count': 0,
    'bucket_count': 4031,
    'earliest_record_timestamp': 1532908800000,
    'latest_record_timestamp': 1536536761000,
    'last_data_time': 1534424932617,
    'latest_empty_bucket_timestamp': 1536535800000,
    'input_record_count': 10396
  },
  'model_size_stats': {
    'job_id': 'test1',
    'result_type': 'model_size_stats',
    'model_bytes': 35978,
    'total_by_field_count': 3,
    'total_over_field_count': 0,
    'total_partition_field_count': 2,
    'bucket_allocation_failures_count': 0,
    'memory_status': 'ok',
    'log_time': 1534424932000,
    'timestamp': 1536535800000
  },
  'datafeed_config': {},
  'state': 'closed'
}, {
  'job_id': 'test2',
  'job_type': 'anomaly_detector',
  'job_version': '7.0.0-alpha1',
  'groups': ['calgroup', 'farequote', 'testgroup', 'testtest'],
  'description': '',
  'create_time': 1533841251548,
  'finished_time': 1533841253453,
  'established_model_memory': 35978,
  'analysis_config': {
    'bucket_span': '15m',
    'summary_count_field_name': 'doc_count',
    'detectors': [{
      'detector_description': 'mean(DistanceKilometers)',
      'function': 'mean',
      'field_name': 'DistanceKilometers',
      'detector_index': 0
    }],
    'influencers': []
  },
  'analysis_limits': {
    'model_memory_limit': '10mb',
    'categorization_examples_limit': 4
  },
  'data_description': {
    'time_field': 'timestamp',
    'time_format': 'epoch_ms'
  },
  'model_plot_config': {
    'enabled': true
  },
  'model_snapshot_retention_days': 1,
  'custom_settings': {
    'created_by': 'single-metric-wizard'
  },
  'model_snapshot_id': '1533841253',
  'model_snapshot_min_version': '6.4.0',
  'results_index_name': 'shared',
  'data_counts': {
    'job_id': 'test2',
    'processed_record_count': 10396,
    'processed_field_count': 20792,
    'input_bytes': 821212,
    'input_field_count': 20792,
    'invalid_date_count': 0,
    'missing_field_count': 0,
    'out_of_order_timestamp_count': 0,
    'empty_bucket_count': 199,
    'sparse_bucket_count': 0,
    'bucket_count': 4031,
    'earliest_record_timestamp': 1532908800000,
    'latest_record_timestamp': 1536536761000,
    'last_data_time': 1533841252866,
    'latest_empty_bucket_timestamp': 1536535800000,
    'input_record_count': 10396
  },
  'model_size_stats': {
    'job_id': 'test2',
    'result_type': 'model_size_stats',
    'model_bytes': 35978,
    'total_by_field_count': 3,
    'total_over_field_count': 0,
    'total_partition_field_count': 2,
    'bucket_allocation_failures_count': 0,
    'memory_status': 'ok',
    'log_time': 1533841253000,
    'timestamp': 1536535800000
  },
  'datafeed_config': {},
  'state': 'closed'
}];
