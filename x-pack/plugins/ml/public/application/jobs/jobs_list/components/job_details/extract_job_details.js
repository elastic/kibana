/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { detectorToString } from '../../../../util/string_utils';
import { formatValues, filterObjects } from './format_values';
import { i18n } from '@kbn/i18n';

export function extractJobDetails(job) {
  if (Object.keys(job).length === 0) {
    return {};
  }

  const general = {
    id: 'general',
    title: i18n.translate('xpack.ml.jobsList.jobDetails.generalTitle', {
      defaultMessage: 'General',
    }),
    position: 'left',
    items: filterObjects(job, true).map(formatValues),
  };

  const customUrl = {
    id: 'customUrl',
    title: i18n.translate('xpack.ml.jobsList.jobDetails.customUrlsTitle', {
      defaultMessage: 'Custom URLs',
    }),
    position: 'right',
    items: [],
  };
  if (job.custom_settings && job.custom_settings.custom_urls) {
    customUrl.items.push(
      ...job.custom_settings.custom_urls.map(cu => [cu.url_name, cu.url_value, cu.time_range])
    );
  }

  const node = {
    id: 'node',
    title: i18n.translate('xpack.ml.jobsList.jobDetails.nodeTitle', {
      defaultMessage: 'Node',
    }),
    position: 'right',
    items: [],
  };
  if (job.node) {
    node.items.push(['name', job.node.name]);
  }

  const calendars = {
    id: 'calendars',
    title: i18n.translate('xpack.ml.jobsList.jobDetails.calendarsTitle', {
      defaultMessage: 'Calendars',
    }),
    position: 'right',
    items: [],
  };
  if (job.calendars) {
    calendars.items = job.calendars.map(c => [
      '',
      <EuiLink href={`#/settings/calendars_list/edit_calendar/${c}?_g=()`}>{c}</EuiLink>,
    ]);
    // remove the calendars list from the general section
    // so not to show it twice.
    const i = general.items.findIndex(item => item[0] === 'calendars');
    if (i >= 0) {
      general.items.splice(i, 1);
    }
  }

  const detectors = {
    id: 'detectors',
    title: i18n.translate('xpack.ml.jobsList.jobDetails.detectorsTitle', {
      defaultMessage: 'Detectors',
    }),
    position: 'left',
    items: [],
  };
  if (job.analysis_config && job.analysis_config.detectors) {
    detectors.items.push(
      ...job.analysis_config.detectors.map(d => {
        const stringifiedDtr = detectorToString(d);
        return [
          stringifiedDtr,
          stringifiedDtr !== d.detector_description ? d.detector_description : '',
        ];
      })
    );
  }

  const influencers = {
    id: 'influencers',
    title: i18n.translate('xpack.ml.jobsList.jobDetails.influencersTitle', {
      defaultMessage: 'Influencers',
    }),
    position: 'left',
    items: job.analysis_config.influencers.map(i => ['', i]),
  };

  const analysisConfig = {
    id: 'analysisConfig',
    title: i18n.translate('xpack.ml.jobsList.jobDetails.analysisConfigTitle', {
      defaultMessage: 'Analysis config',
    }),
    position: 'left',
    items: filterObjects(job.analysis_config),
  };

  const analysisLimits = {
    id: 'analysisLimits',
    title: i18n.translate('xpack.ml.jobsList.jobDetails.analysisLimitsTitle', {
      defaultMessage: 'Analysis limits',
    }),
    position: 'left',
    items: filterObjects(job.analysis_limits),
  };

  const dataDescription = {
    id: 'dataDescription',
    title: i18n.translate('xpack.ml.jobsList.jobDetails.dataDescriptionTitle', {
      defaultMessage: 'Data description',
    }),
    position: 'right',
    items: filterObjects(job.data_description),
  };

  const datafeed = {
    id: 'datafeed',
    title: i18n.translate('xpack.ml.jobsList.jobDetails.datafeedTitle', {
      defaultMessage: 'Datafeed',
    }),
    position: 'left',
    items: filterObjects(job.datafeed_config, true, true),
  };
  if (job.node) {
    datafeed.items.push(['node', JSON.stringify(job.node)]);
  }
  if (job.datafeed_config && job.datafeed_config.timing_stats) {
    // remove the timing_stats list from the datafeed section
    // so not to show it twice.
    const i = datafeed.items.findIndex(item => item[0] === 'timing_stats');
    if (i >= 0) {
      datafeed.items.splice(i, 1);
    }
  }

  const counts = {
    id: 'counts',
    title: i18n.translate('xpack.ml.jobsList.jobDetails.countsTitle', {
      defaultMessage: 'Counts',
    }),
    position: 'left',
    items: filterObjects(job.data_counts).map(formatValues),
  };

  const modelSizeStats = {
    id: 'modelSizeStats',
    title: i18n.translate('xpack.ml.jobsList.jobDetails.modelSizeStatsTitle', {
      defaultMessage: 'Model size stats',
    }),
    position: 'right',
    items: filterObjects(job.model_size_stats).map(formatValues),
  };

  const datafeedTimingStats = {
    id: 'datafeedTimingStats',
    title: i18n.translate('xpack.ml.jobsList.jobDetails.datafeedTimingStatsTitle', {
      defaultMessage: 'Timing stats',
    }),
    position: 'right',
    items:
      job.datafeed_config && job.datafeed_config.timing_stats
        ? filterObjects(job.datafeed_config.timing_stats)
            .filter(o => o[0] !== 'total_search_time_ms') // remove total_search_time_ms as average_search_time_per_bucket_ms is better
            .map(formatValues)
        : [],
  };

  return {
    general,
    customUrl,
    node,
    calendars,
    detectors,
    influencers,
    analysisConfig,
    analysisLimits,
    dataDescription,
    datafeed,
    counts,
    modelSizeStats,
    datafeedTimingStats,
  };
}
