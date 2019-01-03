/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export
const getTooltips = () => ({
  new_job_id: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobIdTooltip', {
      defaultMessage: 'Unique identifier for job, can use lowercase alphanumeric and underscores.'
    })
  },
  new_job_description: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobDescriptionTooltip', {
      defaultMessage: 'Optional descriptive text.'
    })
  },
  new_job_group: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobGroupTooltip', {
      defaultMessage: 'Optional grouping for jobs. New groups can be created or picked from the list of existing groups.'
    })
  },
  new_job_custom_urls: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobCustomUrlsTooltip', {
      defaultMessage: 'Optional drill-through links to source data. Supports string substitution for analyzed fields e.g. $hostname$.'
    })
  },
  new_job_bucketspan: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobBucketspanTooltip', {
      defaultMessage: 'Interval for time series analysis.'
    })
  },
  new_job_sparsedata: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobSparsedataTooltip', {
      defaultMessage: 'Check if you wish to ignore empty buckets from being considered anomalous.'
    })
  },
  new_job_summarycountfieldname: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobSummarycountfieldnameTooltip', {
      defaultMessage: 'Optional, for use if input data has been pre-summarized e.g. doc_count.'
    })
  },
  new_job_categorizationfieldname: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobCategorizationfieldnameTooltip', {
      defaultMessage: 'Optional, for use if analyzing unstructured log data. Using text data types is recommended.'
    })
  },
  new_job_categorizationfilters: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobCategorizationfiltersTooltip', {
      defaultMessage: 'Optional, apply regular expressions to the categorization field'
    })
  },
  new_job_detectors: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobDetectorsTooltip', {
      defaultMessage: 'Defines the fields and functions used for analysis.'
    })
  },
  new_job_influencers: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobInfluencersTooltip', {
      defaultMessage: 'Select which categorical fields have influence on the results. \
      Who/what might you \"blame\" for an anomaly? Recommend 1-3 influencers.'
    })
  },
  new_job_detector_description: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobDetectorDescriptionTooltip', {
      defaultMessage: 'User-friendly text used for dashboards.'
    })
  },
  new_job_detector_function: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobDetectorFunctionTooltip', {
      defaultMessage: 'Analysis functions to be performed e.g. sum, count.'
    })
  },
  new_job_detector_fieldname: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobDetectorFieldnameTooltip', {
      defaultMessage: 'Required for functions: sum, mean, median, max, min, info_content, distinct_count.'
    })
  },
  new_job_detector_fieldname_subset: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobDetectorFieldnameSubsetTooltip', {
      defaultMessage: 'Required for functions: sum, mean, max, min, distinct_count.'
    })
  },
  new_job_detector_byfieldname: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobDetectorByfieldnameTooltip', {
      defaultMessage: 'Required for individual analysis where anomalies are detected compared to an entity\'s own past behavior.'
    })
  },
  new_job_detector_overfieldname: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobDetectorOverfieldnameTooltip', {
      defaultMessage: 'Required for population analysis where anomalies are detected compared to the behavior of the population.'
    })
  },
  new_job_detector_partitionfieldname: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobDetectorPartitionfieldnameTooltip', {
      defaultMessage: 'Allows segmentation of modeling into logical groups.'
    })
  },
  new_job_detector_excludefrequent: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobDetectorExcludefrequentTooltip', {
      defaultMessage: 'If true will automatically identify and exclude frequently occurring entities which \
      may otherwise have dominated results.'
    })
  },
  new_job_data_format: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobDataFormatTooltip', {
      defaultMessage: 'Describes the format of the input data: delimited, JSON, single line or Elasticsearch.'
    })
  },
  new_job_time_field: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobTimeFieldTooltip', {
      defaultMessage: 'Name of the field containing the timestamp.'
    })
  },
  new_job_time_format: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobTimeFormatTooltip', {
      defaultMessage: 'Format of the time field: epoch, epoch_ms or Java DateTimeFormatter string. Important to get right.'
    })
  },
  new_job_delimiter: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobDelimiterTooltip', {
      defaultMessage: 'Character used to separate fields.'
    })
  },
  new_job_quote_character: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobQuoteCharacterTooltip', {
      defaultMessage: 'Character used to encapsulate values containing reserved characters.'
    })
  },
  new_job_enable_datafeed_job: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobEnableDatafeedJobTooltip', {
      defaultMessage: 'Required for jobs that analyze data from Elasticsearch.'
    })
  },
  new_job_data_source: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobDataSourceTooltip', {
      defaultMessage: 'Elasticsearch versions 1.7.x and 2+ supported.'
    })
  },
  new_job_datafeed_query: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobDatafeedQueryTooltip', {
      defaultMessage: 'Elasticsearch Query DSL for filtering input data.'
    })
  },
  new_job_datafeed_query_delay: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobDatafeedQueryDelayTooltip', {
      defaultMessage: 'Advanced option. Time delay in seconds, between current time and latest input data time.'
    })
  },
  new_job_datafeed_frequency: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobDatafeedFrequencyTooltip', {
      defaultMessage: 'Advanced option. The interval between searches.'
    })
  },
  new_job_datafeed_scrollsize: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobDatafeedScrollsizeTooltip', {
      defaultMessage: 'Advanced option. The maximum number of documents requested for a search.'
    })
  },
  new_job_data_preview: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobDataPreviewTooltip', {
      defaultMessage: 'This preview returns the contents of the source field only.'
    })
  },
  new_job_elasticsearch_server: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobElasticsearchServerTooltip', {
      defaultMessage: 'Server address and port of Elasticsearch source.'
    })
  },
  new_job_enable_authenticated: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobEnableAuthenticatedTooltip', {
      defaultMessage: 'Select to specify username and password for secure access.'
    })
  },
  new_job_datafeed_retrieve_source: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobDatafeedRetrieveSourceTooltip', {
      defaultMessage: 'Advanced option. Select to retrieve unfiltered _source document, instead of specified fields.'
    })
  },
  new_job_advanced_settings: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobAdvancedSettingsTooltip', {
      defaultMessage: 'Advanced options'
    })
  },
  new_job_dedicated_index: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobDedicatedIndexTooltip', {
      defaultMessage: 'Select to store results in a separate index for this job.'
    })
  },
  new_job_enable_model_plot: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobEnableModelPlotTooltip', {
      defaultMessage: 'Select to enable model plot. Stores model information along with results. \
      Can add considerable overhead to the performance of the system.'
    })
  },
  new_job_model_memory_limit: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobModelMemoryLimitTooltip', {
      defaultMessage: 'An approximate limit for the amount of memory used by the analytical models.'
    })
  },
  new_filter_ruleaction: {
    text: i18n.translate('xpack.ml.jsonTooltip.newFilterRuleactionTooltip', {
      defaultMessage: 'A string specifying the rule action. Initially, the only valid option is \'filter_results\' but it \
      provisions for expansion to actions like \'disable_modeling\'.'
    })
  },
  new_filter_targetfieldname: {
    text: i18n.translate('xpack.ml.jsonTooltip.newFilterTargetfieldnameTooltip', {
      defaultMessage: 'A string expecting a field name. The filter will apply on all results for the targetFieldName \
      value the ruleConditions apply. When empty, filtering applies only to results for which the ruleConditions apply.'
    })
  },
  new_action_targetfieldvalue: {
    text: i18n.translate('xpack.ml.jsonTooltip.newActionTargetfieldvalueTooltip', {
      defaultMessage: 'A string expecting a value for targetFieldName. If any of the ruleConditions apply, all results \
      will be excluded for that particular targetValue but not for others. Can only be specified if targetFieldName is not empty.'
    })
  },
  new_action_conditionsconnective: {
    text: i18n.translate('xpack.ml.jsonTooltip.newActionConditionsconnectiveTooltip', {
      defaultMessage: 'The logical connective of the ruleConditions.'
    })
  },
  new_action_ruleconditions: {
    text: i18n.translate('xpack.ml.jsonTooltip.newActionRuleconditionsTooltip', {
      defaultMessage: 'The list of conditions used to apply the rules.'
    })
  },
  new_action_conditiontype: {
    text: i18n.translate('xpack.ml.jsonTooltip.newActionConditiontypeTooltip', {
      defaultMessage: 'A string specifying the condition type.'
    })
  },
  new_action_fieldname: {
    text: i18n.translate('xpack.ml.jsonTooltip.newActionFieldnameTooltip', {
      defaultMessage: 'A string specifying the field name on which the rule applies. When empty, rule applies to all results.'
    })
  },
  new_action_fieldvalue: {
    text: i18n.translate('xpack.ml.jsonTooltip.newActionFieldvalueTooltip', {
      defaultMessage: 'A string specifying the numerical field value on which the rule applies. \
      When empty, rule applies to all values of fieldName. Can only be specified if fieldName is not empty.'
    })
  },
  new_action_condition: {
    text: i18n.translate('xpack.ml.jsonTooltip.newActionConditionTooltip', {
      defaultMessage: 'The condition comparing fieldValue and value.'
    })
  },
  new_action_value: {
    text: i18n.translate('xpack.ml.jsonTooltip.newActionValueTooltip', {
      defaultMessage: 'The numerical value to compare against fieldValue.'
    })
  },
  new_action_valuelist: {
    text: i18n.translate('xpack.ml.jsonTooltip.newActionValuelistTooltip', {
      defaultMessage: 'A string that is a unique identifier to a list. Only applicable and required when conditionType is categorical.'
    })
  },
  forecasting_modal_run_duration: {
    text: i18n.translate('xpack.ml.jsonTooltip.forecastingModalRunDurationTooltip', {
      defaultMessage: 'Length of forecast, up to a maximum of 8 weeks. \
      Use s for seconds, m for minutes, h for hours, d for days, w for weeks.'
    })
  },
  forecasting_modal_view_list: {
    text: i18n.translate('xpack.ml.jsonTooltip.forecastingModalViewListTooltip', {
      defaultMessage: 'Lists a maximum of five of the most recently run forecasts.'
    })
  },
  new_job_recognizer_job_prefix: {
    text: i18n.translate('xpack.ml.jsonTooltip.newJobRecognizerJobPrefixTooltip', {
      defaultMessage: 'A prefix which will be added to the beginning of each job ID.'
    })
  },
  new_custom_url_label: {
    text: i18n.translate('xpack.ml.jsonTooltip.newCustomUrlLabelTooltip', {
      defaultMessage: 'A label for the drill-through link.'
    })
  },
  new_custom_url_link_to: {
    text: i18n.translate('xpack.ml.jsonTooltip.newCustomUrlLinkToTooltip', {
      defaultMessage: 'Link to a Kibana dashboard, Discover or another URL.'
    })
  },
  new_custom_url_dashboard: {
    text: i18n.translate('xpack.ml.jsonTooltip.newCustomUrlDashboardTooltip', {
      defaultMessage: 'The dashboard to link to.'
    })
  },
  new_custom_url_discover_index: {
    text: i18n.translate('xpack.ml.jsonTooltip.newCustomUrlDiscoverIndexTooltip', {
      defaultMessage: 'The index pattern to view in Discover.'
    })
  },
  new_custom_url_query_entity: {
    text: i18n.translate('xpack.ml.jsonTooltip.newCustomUrlQueryEntityTooltip', {
      defaultMessage: 'Optional, entities from the anomaly that will be used in the dashboard query.'
    })
  },
  new_custom_url_value: {
    text: i18n.translate('xpack.ml.jsonTooltip.newCustomUrlValueTooltip', {
      defaultMessage: 'URL of the drill-through link. Supports string substitution for analyzed fields e.g. $hostname$.'
    })
  },
  new_custom_url_time_range: {
    text: i18n.translate('xpack.ml.jsonTooltip.newCustomUrlTimeRangeTooltip', {
      defaultMessage: 'The time span that will be displayed in the drill-down page. \
      Set automatically, or enter a specific interval e.g. 10m or 1h.'
    })
  }
});
