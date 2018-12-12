/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { detectorToString } from 'plugins/ml/util/string_utils';
import { formatValues, filterObjects } from './format_values';
import { i18n } from '@kbn/i18n';

export function extractJobDetails(job) {

  if (Object.keys(job).length === 0) {
    return {};
  }

  const general = {
    title: i18n.translate('xpack.ml.jobsList.jobDetails.generalTitle', {
      defaultMessage: 'General'
    }),
    position: 'left',
    items: filterObjects(job, true).map(formatValues)
  };


  const customUrl = {
    title: i18n.translate('xpack.ml.jobsList.jobDetails.customUrlsTitle', {
      defaultMessage: 'Custom URLs'
    }),
    position: 'right',
    items: []
  };
  if (job.custom_settings && job.custom_settings.custom_urls) {
    customUrl.items.push(...job.custom_settings.custom_urls.map(cu => [cu.url_name, cu.url_value, cu.time_range]));
  }

  const node = {
    title: i18n.translate('xpack.ml.jobsList.jobDetails.nodeTitle', {
      defaultMessage: 'Node'
    }),
    position: 'right',
    items: []
  };
  if (job.node) {
    node.items.push(['name', job.node.name]);
  }

  const detectors = {
    title: i18n.translate('xpack.ml.jobsList.jobDetails.detectorsTitle', {
      defaultMessage: 'Detectors'
    }),
    position: 'left',
    items: []
  };
  if (job.analysis_config && job.analysis_config.detectors) {
    detectors.items.push(...job.analysis_config.detectors.map((d) => {
      const stringifiedDtr = detectorToString(d);
      return [
        stringifiedDtr,
        (stringifiedDtr !== d.detector_description) ? d.detector_description : ''
      ];
    }));
  }

  const influencers = {
    title: i18n.translate('xpack.ml.jobsList.jobDetails.influencersTitle', {
      defaultMessage: 'Influencers'
    }),
    position: 'left',
    items: job.analysis_config.influencers.map(i => ['', i])
  };

  const analysisConfig = {
    title: i18n.translate('xpack.ml.jobsList.jobDetails.analysisConfigTitle', {
      defaultMessage: 'Analysis config'
    }),
    position: 'left',
    items: filterObjects(job.analysis_config)
  };

  const analysisLimits = {
    title: i18n.translate('xpack.ml.jobsList.jobDetails.analysisLimitsTitle', {
      defaultMessage: 'Analysis limits'
    }),
    position: 'left',
    items: filterObjects(job.analysis_limits)
  };

  const dataDescription = {
    title: i18n.translate('xpack.ml.jobsList.jobDetails.dataDescriptionTitle', {
      defaultMessage: 'Data description'
    }),
    position: 'right',
    items: filterObjects(job.data_description)
  };

  const datafeed = {
    title: i18n.translate('xpack.ml.jobsList.jobDetails.datafeedTitle', {
      defaultMessage: 'Datafeed'
    }),
    position: 'left',
    items: filterObjects(job.datafeed_config, true, true)
  };
  if (job.node) {
    datafeed.items.push(['node', JSON.stringify(job.node)]);
  }

  const counts = {
    title: i18n.translate('xpack.ml.jobsList.jobDetails.countsTitle', {
      defaultMessage: 'Counts'
    }),
    position: 'left',
    items: filterObjects(job.data_counts).map(formatValues)
  };

  const modelSizeStats = {
    title: i18n.translate('xpack.ml.jobsList.jobDetails.modelSizeStatsTitle', {
      defaultMessage: 'Model size stats'
    }),
    position: 'right',
    items: filterObjects(job.model_size_stats).map(formatValues)
  };

  return {
    general,
    customUrl,
    node,
    detectors,
    influencers,
    analysisConfig,
    analysisLimits,
    dataDescription,
    datafeed,
    counts,
    modelSizeStats
  };
}
