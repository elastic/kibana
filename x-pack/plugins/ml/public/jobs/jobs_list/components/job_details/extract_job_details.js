/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { detectorToString } from 'plugins/ml/util/string_utils';
import { formatValues, filterObjects } from './format_values';

export function extractJobDetails(job) {

  if (Object.keys(job).length === 0) {
    return {};
  }

  const general = {
    title: 'General',
    position: 'left',
    items: filterObjects(job, true).map(formatValues)
  };


  const customUrl = {
    title: 'Custom URLs',
    position: 'right',
    items: []
  };
  if (job.custom_settings && job.custom_settings.custom_urls) {
    customUrl.items.push(...job.custom_settings.custom_urls.map(cu => [cu.url_name, cu.url_value, cu.time_range]));
  }

  const node = {
    title: 'Node',
    position: 'right',
    items: []
  };
  if (job.node) {
    node.items.push(['name', job.node.name]);
  }

  const detectors = {
    title: 'Detectors',
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
    title: 'Influencers',
    position: 'left',
    items: job.analysis_config.influencers.map(i => ['', i])
  };

  const analysisConfig = {
    title: 'Analysis config',
    position: 'left',
    items: filterObjects(job.analysis_config)
  };

  const analysisLimits = {
    title: 'Analysis limits',
    position: 'left',
    items: filterObjects(job.analysis_limits)
  };

  const dataDescription = {
    title: 'Data description',
    position: 'right',
    items: filterObjects(job.data_description)
  };

  const datafeed = {
    title: 'Datafeed',
    position: 'left',
    items: filterObjects(job.datafeed_config, true, true)
  };
  if (job.node) {
    datafeed.items.push(['node', JSON.stringify(job.node)]);
  }

  const counts = {
    title: 'Counts',
    position: 'left',
    items: filterObjects(job.data_counts).map(formatValues)
  };

  const modelSizeStats = {
    title: 'Model size stats',
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
