/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { MetricsExplorerMetric } from 'x-pack/plugins/infra/server/routes/metrics_explorer/types';
import { MetricsExplorerOptions } from '../../containers/metrics_explorer/use_metrics_explorer_options';

interface Props {
  intl: InjectedIntl;
  options: MetricsExplorerOptions;
  onChange: (metrics: MetricsExplorerMetric[]) => void;
}

export const MetricsExplorerMetrics = injectI18n(({ options, onChange }: Props) => {
  return <div>metrics</div>;
});
