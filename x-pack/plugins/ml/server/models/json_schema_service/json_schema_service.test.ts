/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonSchemaService } from './json_schema_service';

describe('JsonSchemaService', function () {
  test('extract schema definition', async () => {
    const service = new JsonSchemaService();

    const result = await service.extractSchema('/_ml/anomaly_detectors/{job_id}', 'put');

    expect(result).toEqual({
      additionalProperties: false,
      properties: {
        allow_lazy_open: {
          description:
            'Advanced configuration option. Specifies whether this job can open when there is insufficient machine learning node capacity for it to be immediately assigned to a node. By default, if a machine learning node with capacity to run the job cannot immediately be found, the open anomaly detection jobs API returns an error. However, this is also subject to the cluster-wide `xpack.ml.max_lazy_ml_nodes` setting. If this option is set to true, the open anomaly detection jobs API does not return an error and the job waits in the opening state until sufficient machine learning node capacity is available.',
          type: 'boolean',
        },
        analysis_config: {
          additionalProperties: false,
          description:
            'Specifies how to analyze the data. After you create a job, you cannot change the analysis configuration; all the properties are informational.',
          properties: {
            bucket_span: {
              description:
                'The size of the interval that the analysis is aggregated into, typically between `5m` and `1h`. This value should be either a whole number of days or equate to a\nwhole number of buckets in one day. If the anomaly detection job uses a datafeed with aggregations, this value must also be divisible by the interval of the date histogram aggregation.\n* @server_default 5m',
              type: 'string',
            },
            categorization_analyzer: {
              anyOf: [
                {
                  type: 'string',
                },
                {
                  $ref: '#/components/schemas/Ml_Types_CategorizationAnalyzerDefinition',
                },
              ],
              description:
                'If `categorization_field_name` is specified, you can also define the analyzer that is used to interpret the categorization field. This property cannot be used at the same time as `categorization_filters`. The categorization analyzer specifies how the `categorization_field` is interpreted by the categorization process. The `categorization_analyzer` field can be specified either as a string or as an object. If it is a string, it must refer to a built-in analyzer or one added by another plugin.',
            },
            categorization_field_name: {
              description:
                'If this property is specified, the values of the specified field will be categorized. The resulting categories must be used in a detector by setting `by_field_name`, `over_field_name`, or `partition_field_name` to the keyword `mlcategory`.',
              type: 'string',
            },
            categorization_filters: {
              description:
                'If `categorization_field_name` is specified, you can also define optional filters. This property expects an array of regular expressions. The expressions are used to filter out matching sequences from the categorization field values. You can use this functionality to fine tune the categorization by excluding sequences from consideration when categories are defined. For example, you can exclude SQL statements that appear in your log files. This property cannot be used at the same time as `categorization_analyzer`. If you only want to define simple regular expression filters that are applied prior to tokenization, setting this property is the easiest method. If you also want to customize the tokenizer or post-tokenization filtering, use the `categorization_analyzer` property instead and include the filters as pattern_replace character filters. The effect is exactly the same.',
              items: {
                type: 'string',
              },
              type: 'array',
            },
            detectors: {
              description:
                'Detector configuration objects specify which data fields a job analyzes. They also specify which analytical functions are used. You can specify multiple detectors for a job. If the detectors array does not contain at least one detector, no analysis can occur and an error is returned.',
              items: {
                $ref: '#/components/schemas/Ml_Types_Detector',
              },
              type: 'array',
            },
            influencers: {
              description:
                'A comma separated list of influencer field names. Typically these can be the by, over, or partition fields that are used in the detector configuration. You might also want to use a field name that is not specifically named in a detector, but is available as part of the input data. When you use multiple detectors, the use of influencers is recommended as it aggregates results for each influencer entity.',
              items: {
                type: 'string',
              },
              type: 'array',
            },
            latency: {
              anyOf: [
                {
                  type: 'string',
                },
                {
                  type: 'number',
                },
              ],
              description:
                'The size of the window in which to expect data that is out of time order. If you specify a non-zero value, it must be greater than or equal to one second. NOTE: Latency is applicable only when you send data by using the post data API.',
            },
            model_prune_window: {
              anyOf: [
                {
                  type: 'string',
                },
                {
                  type: 'number',
                },
              ],
              description:
                'Advanced configuration option. Affects the pruning of models that have not been updated for the given time duration. The value must be set to a multiple of the `bucket_span`. If set too low, important information may be removed from the model. For jobs created in 8.1 and later, the default value is the greater of `30d` or 20 times `bucket_span`.',
            },
            multivariate_by_fields: {
              description:
                'This functionality is reserved for internal use. It is not supported for use in customer environments and is not subject to the support SLA of official GA features. If set to `true`, the analysis will automatically find correlations between metrics for a given by field value and report anomalies when those correlations cease to hold. For example, suppose CPU and memory usage on host A is usually highly correlated with the same metrics on host B. Perhaps this correlation occurs because they are running a load-balanced application. If you enable this property, anomalies will be reported when, for example, CPU usage on host A is high and the value of CPU usage on host B is low. That is to say, you’ll see an anomaly when the CPU of host A is unusual given the CPU of host B. To use the `multivariate_by_fields` property, you must also specify `by_field_name` in your detector.',
              type: 'boolean',
            },
            per_partition_categorization: {
              additionalProperties: false,
              description:
                'Settings related to how categorization interacts with partition fields.',
              properties: {
                enabled: {
                  description:
                    'To enable this setting, you must also set the `partition_field_name` property to the same value in every detector that uses the keyword `mlcategory`. Otherwise, job creation fails.',
                  type: 'boolean',
                },
                stop_on_warn: {
                  description:
                    'This setting can be set to true only if per-partition categorization is enabled. If true, both categorization and subsequent anomaly detection stops for partitions where the categorization status changes to warn. This setting makes it viable to have a job where it is expected that categorization works well for some partitions but not others; you do not pay the cost of bad categorization forever in the partitions where it works badly.',
                  type: 'boolean',
                },
              },
              type: 'object',
            },
            summary_count_field_name: {
              description:
                'If this property is specified, the data that is fed to the job is expected to be pre-summarized. This property value is the name of the field that contains the count of raw data points that have been summarized. The same `summary_count_field_name` applies to all detectors in the job. NOTE: The `summary_count_field_name` property cannot be used with the `metric` function.',
              type: 'string',
            },
          },
          required: ['bucket_span', 'detectors'],
          type: 'object',
        },
        analysis_limits: {
          additionalProperties: false,
          description:
            'Limits can be applied for the resources required to hold the mathematical models in memory. These limits are approximate and can be set per job. They do not control the memory used by other processes, for example the Elasticsearch Java processes.',
          properties: {
            categorization_examples_limit: {
              description:
                'The maximum number of examples stored per category in memory and in the results data store. If you increase this value, more examples are available, however it requires that you have more storage available. If you set this value to 0, no examples are stored. NOTE: The `categorization_examples_limit` applies only to analysis that uses categorization.',
              type: 'number',
            },
            model_memory_limit: {
              description:
                'The approximate maximum amount of memory resources that are required for analytical processing. Once this limit is approached, data pruning becomes more aggressive. Upon exceeding this limit, new entities are not modeled. If the `xpack.ml.max_model_memory_limit` setting has a value greater than 0 and less than 1024mb, that value is used instead of the default. The default value is relatively small to ensure that high resource usage is a conscious decision. If you have jobs that are expected to analyze high cardinality fields, you will likely need to use a higher value. If you specify a number instead of a string, the units are assumed to be MiB. Specifying a string is recommended for clarity. If you specify a byte size unit of `b` or `kb` and the number does not equate to a discrete number of megabytes, it is rounded down to the closest MiB. The minimum valid value is 1 MiB. If you specify a value less than 1 MiB, an error occurs. If you specify a value for the `xpack.ml.max_model_memory_limit` setting, an error occurs when you try to create jobs that have `model_memory_limit` values greater than that setting value.',
              type: 'string',
            },
          },
          type: 'object',
        },
        background_persist_interval: {
          anyOf: [
            {
              type: 'string',
            },
            {
              type: 'number',
            },
          ],
          description:
            'Advanced configuration option. The time between each periodic persistence of the model. The default value is a randomized value between 3 to 4 hours, which avoids all jobs persisting at exactly the same time. The smallest allowed value is 1 hour. For very large models (several GB), persistence could take 10-20 minutes, so do not set the `background_persist_interval` value too low.',
        },
        custom_settings: {
          description: 'Advanced configuration option. Contains custom meta data about the job.',
        },
        daily_model_snapshot_retention_after_days: {
          description:
            'Advanced configuration option, which affects the automatic removal of old model snapshots for this job. It specifies a period of time (in days) after which only the first snapshot per day is retained. This period is relative to the timestamp of the most recent snapshot for this job. Valid values range from 0 to `model_snapshot_retention_days`.',
          type: 'number',
        },
        data_description: {
          additionalProperties: false,
          description:
            'Defines the format of the input data when you send data to the job by using the post data API. Note that when configure a datafeed, these properties are automatically set. When data is received via the post data API, it is not stored in Elasticsearch. Only the results for anomaly detection are retained.',
          properties: {
            field_delimiter: {
              type: 'string',
            },
            format: {
              description: 'Only JSON format is supported at this time.',
              type: 'string',
            },
            time_field: {
              description: 'The name of the field that contains the timestamp.',
              type: 'string',
            },
            time_format: {
              description:
                "The time format, which can be `epoch`, `epoch_ms`, or a custom pattern. The value `epoch` refers to UNIX or Epoch time (the number of seconds since 1 Jan 1970). The value `epoch_ms` indicates that time is measured in milliseconds since the epoch. The `epoch` and `epoch_ms` time formats accept either integer or real values. Custom patterns must conform to the Java DateTimeFormatter class. When you use date-time formatting patterns, it is recommended that you provide the full date, time and time zone. For example: `yyyy-MM-dd'T'HH:mm:ssX`. If the pattern that you specify is not sufficient to produce a complete timestamp, job creation fails.",
              type: 'string',
            },
          },
          type: 'object',
        },
        datafeed_config: {
          additionalProperties: false,
          description:
            'Defines a datafeed for the anomaly detection job. If Elasticsearch security features are enabled, your datafeed remembers which roles the user who created it had at the time of creation and runs the query using those same roles. If you provide secondary authorization headers, those credentials are used instead.',
          properties: {
            aggregations: {
              additionalProperties: {
                $ref: '#/components/schemas/Types_Aggregations_AggregationContainer',
              },
              description:
                'If set, the datafeed performs aggregation searches. Support for aggregations is limited and should be used only with low cardinality data.',
              type: 'object',
            },
            aggs: {
              additionalProperties: {
                $ref: '#/components/schemas/Types_Aggregations_AggregationContainer',
              },
              description:
                'If set, the datafeed performs aggregation searches. Support for aggregations is limited and should be used only with low cardinality data.',
              type: 'object',
            },
            chunking_config: {
              additionalProperties: false,
              description:
                'Datafeeds might be required to search over long time periods, for several months or years. This search is split into time chunks in order to ensure the load on Elasticsearch is managed. Chunking configuration controls how the size of these time chunks are calculated and is an advanced configuration option.',
              properties: {
                mode: {
                  description:
                    'If the mode is `auto`, the chunk size is dynamically calculated;\nthis is the recommended value when the datafeed does not use aggregations.\nIf the mode is `manual`, chunking is applied according to the specified `time_span`;\nuse this mode when the datafeed uses aggregations. If the mode is `off`, no chunking is applied.',
                  enum: ['auto', 'manual', 'off'],
                  type: 'string',
                },
                time_span: {
                  anyOf: [
                    {
                      type: 'string',
                    },
                    {
                      type: 'number',
                    },
                  ],
                  description:
                    'The time span that each search will be querying. This setting is applicable only when the `mode` is set to `manual`.',
                },
              },
              required: ['mode'],
              type: 'object',
            },
            datafeed_id: {
              description:
                'A numerical character string that uniquely identifies the datafeed. This identifier can contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores. It must start and end with alphanumeric characters. The default value is the job identifier.',
              type: 'string',
            },
            delayed_data_check_config: {
              additionalProperties: false,
              description:
                'Specifies whether the datafeed checks for missing data and the size of the window. The datafeed can optionally search over indices that have already been read in an effort to determine whether any data has subsequently been added to the index. If missing data is found, it is a good indication that the `query_delay` option is set too low and the data is being indexed after the datafeed has passed that moment in time. This check runs only on real-time datafeeds.',
              properties: {
                check_window: {
                  anyOf: [
                    {
                      type: 'string',
                    },
                    {
                      type: 'number',
                    },
                  ],
                  description:
                    'The window of time that is searched for late data. This window of time ends with the latest finalized bucket.\nIt defaults to null, which causes an appropriate `check_window` to be calculated when the real-time datafeed runs.\nIn particular, the default `check_window` span calculation is based on the maximum of `2h` or `8 * bucket_span`.',
                },
                enabled: {
                  description:
                    'Specifies whether the datafeed periodically checks for delayed data.',
                  type: 'boolean',
                },
              },
              required: ['enabled'],
              type: 'object',
            },
            frequency: {
              description:
                'The interval at which scheduled queries are made while the datafeed runs in real time. The default value is either the bucket span for short bucket spans, or, for longer bucket spans, a sensible fraction of the bucket span. For example: `150s`. When `frequency` is shorter than the bucket span, interim results for the last (partial) bucket are written then eventually overwritten by the full bucket results. If the datafeed uses aggregations, this value must be divisible by the interval of the date histogram aggregation.',
              type: 'string',
            },
            indexes: {
              items: {
                type: 'string',
              },
              type: 'array',
            },
            indices: {
              description:
                'An array of index names. Wildcards are supported. If any indices are in remote clusters, the machine learning nodes must have the `remote_cluster_client` role.',
              items: {
                type: 'string',
              },
              type: 'array',
            },
            indices_options: {
              $ref: '#/components/schemas/Types_IndicesOptions',
              description: 'Specifies index expansion options that are used during search.',
            },
            job_id: {
              type: 'string',
            },
            max_empty_searches: {
              description:
                'If a real-time datafeed has never seen any data (including during any initial training period) then it will automatically stop itself and close its associated job after this many real-time searches that return no documents. In other words, it will stop after `frequency` times `max_empty_searches` of real-time operation. If not set then a datafeed with no end time that sees no data will remain started until it is explicitly stopped.',
              type: 'number',
            },
            query: {
              $ref: '#/components/schemas/Types_QueryDsl_QueryContainer',
              description:
                'The Elasticsearch query domain-specific language (DSL). This value corresponds to the query object in an Elasticsearch search POST body. All the options that are supported by Elasticsearch can be used, as this object is passed verbatim to Elasticsearch.',
            },
            query_delay: {
              description:
                'The number of seconds behind real time that data is queried. For example, if data from 10:04 a.m. might not be searchable in Elasticsearch until 10:06 a.m., set this property to 120 seconds. The default value is randomly selected between `60s` and `120s`. This randomness improves the query performance when there are multiple jobs running on the same node.',
              type: 'string',
            },
            runtime_mappings: {
              additionalProperties: {
                anyOf: [
                  {
                    $ref: '#/components/schemas/Types_Mapping_RuntimeField',
                  },
                  {
                    items: {
                      $ref: '#/components/schemas/Types_Mapping_RuntimeField',
                    },
                    type: 'array',
                  },
                ],
              },
              description: 'Specifies runtime fields for the datafeed search.',
              type: 'object',
            },
            script_fields: {
              additionalProperties: {
                $ref: '#/components/schemas/Types_ScriptField',
              },
              description:
                'Specifies scripts that evaluate custom expressions and returns script fields to the datafeed. The detector configuration objects in a job can contain functions that use these script fields.',
              type: 'object',
            },
            scroll_size: {
              description:
                'The size parameter that is used in Elasticsearch searches when the datafeed does not use aggregations. The maximum value is the value of `index.max_result_window`, which is 10,000 by default.',
              type: 'number',
            },
          },
          required: ['indices', 'query'],
          type: 'object',
        },
        description: {
          description: 'A description of the job.',
          type: 'string',
        },
        groups: {
          description: 'A list of job groups. A job can belong to no groups or many.',
          items: {
            type: 'string',
          },
          type: 'array',
        },
        model_plot_config: {
          additionalProperties: false,
          description:
            'This advanced configuration option stores model information along with the results. It provides a more detailed view into anomaly detection. If you enable model plot it can add considerable overhead to the performance of the system; it is not feasible for jobs with many entities. Model plot provides a simplified and indicative view of the model and its bounds. It does not display complex features such as multivariate correlations or multimodal data. As such, anomalies may occasionally be reported which cannot be seen in the model plot. Model plot config can be configured when the job is created or updated later. It must be disabled if performance issues are experienced.',
          properties: {
            annotations_enabled: {
              description:
                'If true, enables calculation and storage of the model change annotations for each entity that is being analyzed.',
              type: 'boolean',
            },
            enabled: {
              description:
                'If true, enables calculation and storage of the model bounds for each entity that is being analyzed.',
              type: 'boolean',
            },
            terms: {
              description:
                'Limits data collection to this comma separated list of partition or by field values. If terms are not specified or it is an empty string, no filtering is applied. Wildcards are not supported. Only the specified terms can be viewed when using the Single Metric Viewer.',
              type: 'string',
            },
          },
          type: 'object',
        },
        model_snapshot_retention_days: {
          description:
            'Advanced configuration option, which affects the automatic removal of old model snapshots for this job. It specifies the maximum period of time (in days) that snapshots are retained. This period is relative to the timestamp of the most recent snapshot for this job. By default, snapshots ten days older than the newest snapshot are deleted.',
          type: 'number',
        },
        renormalization_window_days: {
          description:
            'Advanced configuration option. The period over which adjustments to the score are applied, as new data is seen. The default value is the longer of 30 days or 100 bucket spans.',
          type: 'number',
        },
        results_index_name: {
          description:
            'A text string that affects the name of the machine learning results index. By default, the job generates an index named `.ml-anomalies-shared`.',
          type: 'string',
        },
        results_retention_days: {
          description:
            'Advanced configuration option. The period of time (in days) that results are retained. Age is calculated relative to the timestamp of the latest bucket result. If this property has a non-null value, once per day at 00:30 (server time), results that are the specified number of days older than the latest bucket result are deleted from Elasticsearch. The default value is null, which means all results are retained. Annotations generated by the system also count as results for retention purposes; they are deleted after the same number of days as results. Annotations added by users are retained forever.',
          type: 'number',
        },
      },
      required: ['analysis_config', 'background_persist_interval', 'data_description'],
      type: 'object',
    });
  });
});
