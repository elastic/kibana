/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
// @ts-ignore
import { formatMetric } from '../../../lib/format_number';
// @ts-ignore
import { SummaryStatus } from '../../summary_status';

// @ts-ignore
export function Status({ stats }) {
  const metrics = [
    {
      label: i18n.translate('xpack.monitoring.entSearch.overview.instances', {
        defaultMessage: 'Instances',
      }),
      value: formatMetric(stats.totalInstances, 'int_commas'),
      'data-test-subj': 'totalInstances',
    },
    {
      label: i18n.translate('xpack.monitoring.entSearch.overview.appSearchEngines', {
        defaultMessage: 'App Search Engines',
      }),
      value: formatMetric(stats.appSearchEngines, 'int_commas'),
      'data-test-subj': 'appSearchEngines',
    },
    {
      label: i18n.translate('xpack.monitoring.entSearch.overview.workplaceSearchOrgSources', {
        defaultMessage: 'Org Content Sources',
      }),
      value: formatMetric(stats.workplaceSearchOrgSources, 'int_commas'),
      'data-test-subj': 'workplaceSearchOrgSources',
    },
    {
      label: i18n.translate('xpack.monitoring.entSearch.overview.workplaceSearchPrivateSources', {
        defaultMessage: 'Private Content Sources',
      }),
      value: formatMetric(stats.workplaceSearchPrivateSources, 'int_commas'),
      'data-test-subj': 'workplaceSearchPrivateSources',
    },
  ];

  return <SummaryStatus metrics={metrics} data-test-subj="entSearchSummaryStatus" />;
}
