/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useMemo } from 'react';
import { pick } from 'lodash';
import { createBrowserHistory } from 'history';

import datemath from '@elastic/datemath';

import { Router } from '@kbn/shared-ux-router';
import type { EmbeddableLogRateAnalysisInput } from '@kbn/aiops-log-rate-analysis/embeddable';

import { LogRateAnalysisContent } from '../../../shared_lazy_components';
import type { LogRateAnalysisProps } from '../../../shared_components/log_rate_analysis';
import { useAiopsAppContext } from '../../../hooks/use_aiops_app_context';

export type LogRateAnalysisEmbeddableProps = Readonly<
  EmbeddableLogRateAnalysisInput & LogRateAnalysisProps
>;

export const LogRateAnalysisEmbeddable: FC<LogRateAnalysisEmbeddableProps> = ({
  dataView,
  timeRange,
}) => {
  const services = useAiopsAppContext();

  const timeRangeParsed = useMemo(() => {
    if (timeRange) {
      const min = datemath.parse(timeRange.from);
      const max = datemath.parse(timeRange.to);
      if (min && max) {
        return { min, max };
      }
    }
  }, [timeRange]);

  const history = createBrowserHistory();

  return (
    <Router history={history}>
      <LogRateAnalysisContent
        embeddingOrigin="dashboard"
        dataView={dataView}
        timeRange={timeRangeParsed}
        appDependencies={pick(services, [
          'analytics',
          'application',
          'data',
          'executionContext',
          'charts',
          'fieldFormats',
          'http',
          'notifications',
          'share',
          'storage',
          'uiSettings',
          'unifiedSearch',
          'theme',
          'lens',
          'i18n',
        ])}
      />
    </Router>
  );
};

// eslint-disable-next-line import/no-default-export
export default LogRateAnalysisEmbeddable;
